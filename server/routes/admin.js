const express = require("express")
const { body, validationResult, query } = require("express-validator")
const User = require("../models/User")
const Item = require("../models/Item")
const Swap = require("../models/Swap")
const { protect, authorizeAdmin } = require("../middleware/auth")
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getItemsAdmin, // Admin specific item management
  deleteItemAdmin,
  getSwapsAdmin, // Admin specific swap management
  updateSwapStatusAdmin,
} = require("../controllers/admin") // Assuming you'll create an admin controller

const router = express.Router()

// Apply auth and adminAuth to all routes
router.use(protect, authorizeAdmin)

// User Management
router.route("/users").get(getUsers) // Get all users
router
  .route("/users/:id")
  .get(getUser) // Get single user
  .put(updateUser) // Update user
  .delete(deleteUser) // Delete user

// Item Management (Admin can delete any item)
router.route("/items").get(getItemsAdmin) // Get all items (for moderation)
router.route("/items/:id").delete(deleteItemAdmin) // Delete any item

// Swap Management (Admin can view/update status of any swap)
router.route("/swaps").get(getSwapsAdmin) // Get all swaps
router.route("/swaps/:id").put(updateSwapStatusAdmin) // Update status of any swap

// @route   GET /api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get("/stats", async (req, res) => {
  try {
    const [totalUsers, activeUsers, totalItems, pendingItems, approvedItems, totalSwaps, completedSwaps, pendingSwaps] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        Item.countDocuments(),
        Item.countDocuments({ status: "pending" }),
        Item.countDocuments({ status: "approved" }),
        Swap.countDocuments(),
        Swap.countDocuments({ status: "completed" }),
        Swap.countDocuments({ status: "pending" }),
      ])

    // Get recent activity
    const recentItems = await Item.find()
      .populate("owner", "username firstName lastName")
      .sort({ createdAt: -1 })
      .limit(5)

    const recentSwaps = await Swap.find()
      .populate("requester", "username firstName lastName")
      .populate("owner", "username firstName lastName")
      .populate("requestedItem", "title")
      .sort({ createdAt: -1 })
      .limit(5)

    // Get monthly stats for the last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyStats = await Item.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ])

    res.json({
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
        },
        items: {
          total: totalItems,
          pending: pendingItems,
          approved: approvedItems,
          available: await Item.countDocuments({ status: "available" }),
          swapped: await Item.countDocuments({ status: "swapped" }),
        },
        swaps: {
          total: totalSwaps,
          pending: pendingSwaps,
          completed: completedSwaps,
          active: await Swap.countDocuments({ status: "accepted" }),
        },
      },
      recentActivity: {
        items: recentItems,
        swaps: recentSwaps,
      },
      monthlyStats,
    })
  } catch (error) {
    console.error("Get admin stats error:", error)
    res.status(500).json({ message: "Server error while fetching admin stats" })
  }
})

module.exports = router
