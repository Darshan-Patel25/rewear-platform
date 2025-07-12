const express = require("express")
const { body, validationResult, query } = require("express-validator")
const User = require("../models/User")
const Item = require("../models/Item")
const Swap = require("../models/Swap")
const { auth, adminAuth } = require("../middleware/auth")

const router = express.Router()

// Apply auth and adminAuth to all routes
router.use(auth, adminAuth)

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

// @route   GET /api/admin/users
// @desc    Get all users with filtering and pagination
// @access  Private (Admin only)
router.get(
  "/users",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().trim(),
    query("status").optional().isIn(["active", "inactive"]),
    query("role").optional().isIn(["user", "admin"]),
    query("sortBy").optional().isIn(["newest", "oldest", "username", "email"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { page = 1, limit = 20, search, status, role, sortBy = "newest" } = req.query

      // Build filter
      const filter = {}

      if (search) {
        filter.$or = [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
        ]
      }

      if (status === "active") filter.isActive = true
      if (status === "inactive") filter.isActive = false
      if (role) filter.role = role

      // Build sort
      let sort = {}
      switch (sortBy) {
        case "oldest":
          sort = { createdAt: 1 }
          break
        case "username":
          sort = { username: 1 }
          break
        case "email":
          sort = { email: 1 }
          break
        default:
          sort = { createdAt: -1 }
      }

      const users = await User.find(filter)
        .select("-password -passwordResetToken -emailVerificationToken")
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await User.countDocuments(filter)

      res.json({
        users,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error("Get users error:", error)
      res.status(500).json({ message: "Server error while fetching users" })
    }
  },
)

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (activate/deactivate)
// @access  Private (Admin only)
router.put(
  "/users/:id/status",
  [
    body("isActive").isBoolean().withMessage("isActive must be a boolean"),
    body("reason").optional().trim().isLength({ max: 500 }).withMessage("Reason cannot exceed 500 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { isActive, reason } = req.body

      const user = await User.findById(req.params.id)
      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      // Prevent deactivating other admins
      if (user.role === "admin" && !isActive) {
        return res.status(400).json({ message: "Cannot deactivate admin users" })
      }

      user.isActive = isActive
      await user.save()

      // Log admin action (in production, you'd want to store this in an audit log)
      console.log(
        `Admin ${req.user.username} ${isActive ? "activated" : "deactivated"} user ${user.username}. Reason: ${reason || "None provided"}`,
      )

      res.json({
        message: `User ${isActive ? "activated" : "deactivated"} successfully`,
        user: user.getPublicProfile(),
      })
    } catch (error) {
      console.error("Update user status error:", error)
      res.status(500).json({ message: "Server error while updating user status" })
    }
  },
)

// @route   GET /api/admin/items
// @desc    Get all items for admin review
// @access  Private (Admin only)
router.get(
  "/items",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status").optional().isIn(["pending", "approved", "rejected", "available", "reserved", "swapped"]),
    query("category").optional().isIn(["tops", "bottoms", "dresses", "outerwear", "shoes", "accessories"]),
    query("reported").optional().isBoolean(),
    query("sortBy").optional().isIn(["newest", "oldest", "reports"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { page = 1, limit = 20, status, category, reported, sortBy = "newest" } = req.query

      // Build filter
      const filter = {}

      if (status) filter.status = status
      if (category) filter.category = category
      if (reported === "true") {
        filter["reports.0"] = { $exists: true }
      }

      // Build sort
      let sort = {}
      switch (sortBy) {
        case "oldest":
          sort = { createdAt: 1 }
          break
        case "reports":
          sort = { reports: -1, createdAt: -1 }
          break
        default:
          sort = { createdAt: -1 }
      }

      const items = await Item.find(filter)
        .populate("owner", "username firstName lastName email")
        .populate("reports.user", "username firstName lastName")
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await Item.countDocuments(filter)

      res.json({
        items,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error("Get admin items error:", error)
      res.status(500).json({ message: "Server error while fetching items" })
    }
  },
)

// @route   PUT /api/admin/items/:id/review
// @desc    Approve or reject item
// @access  Private (Admin only)
router.put(
  "/items/:id/review",
  [
    body("action").isIn(["approve", "reject"]).withMessage("Invalid action"),
    body("reason").optional().trim().isLength({ max: 500 }).withMessage("Reason cannot exceed 500 characters"),
    body("adminNotes")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Admin notes cannot exceed 1000 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { action, reason, adminNotes } = req.body

      const item = await Item.findById(req.params.id).populate("owner")
      if (!item) {
        return res.status(404).json({ message: "Item not found" })
      }

      if (item.status !== "pending") {
        return res.status(400).json({ message: "Item has already been reviewed" })
      }

      if (action === "approve") {
        item.status = "available"
        item.rejectionReason = undefined
      } else {
        item.status = "rejected"
        item.rejectionReason = reason
      }

      if (adminNotes) {
        item.adminNotes = adminNotes
      }

      await item.save()

      // Notify item owner
      const io = req.app.get("io")
      if (io) {
        io.to(item.owner._id.toString()).emit("item-reviewed", {
          itemId: item._id,
          action,
          reason,
          message: `Your item "${item.title}" has been ${action}d`,
        })
      }

      // Log admin action
      console.log(
        `Admin ${req.user.username} ${action}d item ${item._id} by ${item.owner.username}. Reason: ${reason || "None provided"}`,
      )

      res.json({
        message: `Item ${action}d successfully`,
        item,
      })
    } catch (error) {
      console.error("Review item error:", error)
      res.status(500).json({ message: "Server error while reviewing item" })
    }
  },
)

// @route   PUT /api/admin/items/:id/feature
// @desc    Feature or unfeature item
// @access  Private (Admin only)
router.put(
  "/items/:id/feature",
  [
    body("featured").isBoolean().withMessage("featured must be a boolean"),
    body("featuredUntil").optional().isISO8601().withMessage("featuredUntil must be a valid date"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { featured, featuredUntil } = req.body

      const item = await Item.findById(req.params.id)
      if (!item) {
        return res.status(404).json({ message: "Item not found" })
      }

      item.featured = featured
      if (featured && featuredUntil) {
        item.featuredUntil = new Date(featuredUntil)
      } else if (!featured) {
        item.featuredUntil = undefined
      }

      await item.save()

      res.json({
        message: `Item ${featured ? "featured" : "unfeatured"} successfully`,
        item,
      })
    } catch (error) {
      console.error("Feature item error:", error)
      res.status(500).json({ message: "Server error while featuring item" })
    }
  },
)

// @route   DELETE /api/admin/items/:id
// @desc    Delete item (admin override)
// @access  Private (Admin only)
router.delete(
  "/items/:id",
  [
    body("reason")
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Reason is required and cannot exceed 500 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { reason } = req.body

      const item = await Item.findById(req.params.id).populate("owner")
      if (!item) {
        return res.status(404).json({ message: "Item not found" })
      }

      // Check if item is involved in active swaps
      const activeSwaps = await Swap.countDocuments({
        $or: [{ requestedItem: item._id }, { offeredItem: item._id }],
        status: { $in: ["pending", "accepted"] },
      })

      if (activeSwaps > 0) {
        return res.status(400).json({
          message: "Cannot delete item with active swaps",
        })
      }

      await Item.findByIdAndDelete(item._id)

      // Notify item owner
      const io = req.app.get("io")
      if (io) {
        io.to(item.owner._id.toString()).emit("item-deleted", {
          itemTitle: item.title,
          reason,
          message: `Your item "${item.title}" has been removed by an administrator`,
        })
      }

      // Log admin action
      console.log(`Admin ${req.user.username} deleted item ${item._id} by ${item.owner.username}. Reason: ${reason}`)

      res.json({
        message: "Item deleted successfully",
      })
    } catch (error) {
      console.error("Delete item error:", error)
      res.status(500).json({ message: "Server error while deleting item" })
    }
  },
)

// @route   GET /api/admin/swaps
// @desc    Get all swaps for admin monitoring
// @access  Private (Admin only)
router.get(
  "/swaps",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status").optional().isIn(["pending", "accepted", "rejected", "completed", "cancelled"]),
    query("type").optional().isIn(["direct", "points"]),
    query("sortBy").optional().isIn(["newest", "oldest", "value"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { page = 1, limit = 20, status, type, sortBy = "newest" } = req.query

      // Build filter
      const filter = {}
      if (status) filter.status = status
      if (type) filter.type = type

      // Build sort
      let sort = {}
      switch (sortBy) {
        case "oldest":
          sort = { createdAt: 1 }
          break
        case "value":
          sort = { pointsOffered: -1, createdAt: -1 }
          break
        default:
          sort = { createdAt: -1 }
      }

      const swaps = await Swap.find(filter)
        .populate("requester", "username firstName lastName email")
        .populate("owner", "username firstName lastName email")
        .populate("requestedItem", "title pointValue status")
        .populate("offeredItem", "title pointValue status")
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await Swap.countDocuments(filter)

      res.json({
        swaps,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error("Get admin swaps error:", error)
      res.status(500).json({ message: "Server error while fetching swaps" })
    }
  },
)

module.exports = router
