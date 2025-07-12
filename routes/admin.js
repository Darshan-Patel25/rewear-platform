const express = require('express')
const { body, validationResult } = require('express-validator')
const Item = require('../models/Item')
const User = require('../models/User')
const Swap = require('../models/Swap')
const { auth, adminAuth } = require('../middleware/auth')

const router = express.Router()

// @route   GET /api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalItems,
      pendingItems,
      approvedItems,
      totalSwaps,
      completedSwaps,
      pendingSwaps
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Item.countDocuments(),
      Item.countDocuments({ status: 'pending' }),
      Item.countDocuments({ status: 'approved' }),
      Swap.countDocuments(),
      Swap.countDocuments({ status: 'completed' }),
      Swap.countDocuments({ status: 'pending' })
    ])

    // Get recent activity
    const recentItems = await Item.find({ status: 'pending' })
      .populate('owner', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5)

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username firstName lastName createdAt isActive')

    res.json({
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        items: {
          total: totalItems,
          pending: pendingItems,
          approved: approvedItems,
          rejected: totalItems - pendingItems - approvedItems
        },
        swaps: {
          total: totalSwaps,
          completed: completedSwaps,
          pending: pendingSwaps,
          active: totalSwaps - completedSwaps - pendingSwaps
        }
      },
      recentActivity: {
        items: recentItems,
        users: recentUsers
      }
    })

  } catch (error) {
    console.error('Get admin stats error:', error)
    res.status(500).json({ message: 'Server error while fetching admin statistics' })
  }
})

// @route   GET /api/admin/items
// @desc    Get all items for admin review
// @access  Private (Admin only)
router.get('/items', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const status = req.query.status || 'pending'

    const filter = {}
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status
    }

    const items = await Item.find(filter)
      .populate('owner', 'username firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Item.countDocuments(filter)

    res.json({
      items,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    })

  } catch (error) {
    console.error('Get admin items error:', error)
    res.status(500).json({ message: 'Server error while fetching items for admin' })
  }
})

// @route   PUT /api/admin/items/:id/approve
// @desc    Approve an item
// @access  Private (Admin only)
router.put('/items/:id/approve', adminAuth, [
  body('message').optional().isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const item = await Item.findById(req.params.id).populate('owner', 'username firstName lastName')

    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    if (item.status !== 'pending') {
      return res.status(400).json({ message: 'Item is not pending approval' })
    }

    item.status = 'approved'
    await item.save()

    // Send notification to item owner
    req.io.to(item.owner._id.toString()).emit('item-approved', {
      item: item.toObject(),
      message: `Your item "${item.title}" has been approved and is now live!`
    })

    res.json({
      message: 'Item approved successfully',
      item
    })

  } catch (error) {
    console.error('Approve item error:', error)
    res.status(500).json({ message: 'Server error while approving item' })
  }
})

// @route   PUT /api/admin/items/:id/reject
// @desc    Reject an item
// @access  Private (Admin only)
router.put('/items/:id/reject', adminAuth, [
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Rejection reason is required and cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const item = await Item.findById(req.params.id).populate('owner', 'username firstName lastName')

    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    if (item.status !== 'pending') {
      return res.status(400).json({ message: 'Item is not pending approval' })
    }

    item.status = 'rejected'
    await item.save()

    // Send notification to item owner
    req.io.to(item.owner._id.toString()).emit('item-rejected', {
      item: item.toObject(),
      reason: req.body.reason,
      message: `Your item "${item.title}" has been rejected. Reason: ${req.body.reason}`
    })

    res.json({
      message: 'Item rejected successfully',
      item,
      reason: req.body.reason
    })

  } catch (error) {
    console.error('Reject item error:', error)
    res.status(500).json({ message: 'Server error while rejecting item' })
  }
})

// @route   DELETE /api/admin/items/:id
// @desc    Delete an item (admin)
// @access  Private (Admin only)
router.delete('/items/:id', adminAuth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('owner', 'username firstName lastName')

    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    // Check if item is in any active swaps
    const activeSwaps = await Swap.countDocuments({
      $or: [
        { requestedItem: req.params.id },
        { offeredItem: req.params.id }
      ],
      status: { $in: ['pending', 'accepted'] }
    })

    if (activeSwaps > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete item that is part of active swaps' 
      })
    }

    await Item.findByIdAndDelete(req.params.id)

    // Notify item owner
    req.io.to(item.owner._id.toString()).emit('item-deleted', {
      itemTitle: item.title,
      message: `Your item "${item.title}" has been removed by an administrator`
    })

    res.json({ message: 'Item deleted successfully' })

  } catch (error) {
    console.error('Delete item error:', error)
    res.status(500).json({ message: 'Server error while deleting item' })
  }
})

// @route   GET /api/admin/users
// @desc    Get all users for admin management
// @access  Private (Admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const search = req.query.search

    let filter = {}
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ]
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await User.countDocuments(filter)

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    })

  } catch (error) {
    console.error('Get admin users error:', error)
    res.status(500).json({ message: 'Server error while fetching users for admin' })
  }
})

// @route   PUT /api/admin/users/:id/toggle-status
// @desc    Activate/deactivate user account
// @access  Private (Admin only)
router.put('/users/:id/toggle-status', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Don't allow deactivating other admins
    if (user.role === 'admin' && user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Cannot deactivate other admin accounts' })
    }

    user.isActive = !user.isActive
    await user.save()

    // Send notification to user
    req.io.to(user._id.toString()).emit('account-status-changed', {
      isActive: user.isActive,
      message: user.isActive 
        ? 'Your account has been reactivated' 
        : 'Your account has been deactivated'
    })

    res.json({
      message: `User account ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: user.toJSON()
    })

  } catch (error) {
    console.error('Toggle user status error:', error)
    res.status(500).json({ message: 'Server error while toggling user status' })
  }
})

// @route   GET /api/admin/swaps
// @desc    Get all swaps for admin monitoring
// @access  Private (Admin only)
router.get('/swaps', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const status = req.query.status

    let filter = {}
    if (status && ['pending', 'accepted', 'rejected', 'completed', 'cancelled'].includes(status)) {
      filter.status = status
    }

    const swaps = await Swap.find(filter)
      .populate('requester', 'username firstName lastName email')
      .populate('owner', 'username firstName lastName email')
      .populate('requestedItem', 'title images pointValue')
      .populate('offeredItem', 'title images pointValue')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Swap.countDocuments(filter)

    res.json({
      swaps,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    })

  } catch (error) {
    console.error('Get admin swaps error:', error)
    res.status(500).json({ message: 'Server error while fetching swaps for admin' })
  }
})

module.exports = router
