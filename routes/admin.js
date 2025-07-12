const express = require("express")
const { body, validationResult, query } = require("express-validator")
const Item = require("../models/Item")
const User = require("../models/User")
const Swap = require("../models/Swap")
const { adminAuth } = require("../middleware/auth")

const router = express.Router()

// Get dashboard stats
router.get("/stats", adminAuth, async (req, res) => {
  try {
    const [totalUsers, activeUsers, totalItems, pendingItems, approvedItems, totalSwaps, completedSwaps] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        Item.countDocuments(),
        Item.countDocuments({ status: "pending" }),
        Item.countDocuments({ status: "approved" }),
        Swap.countDocuments(),
        Swap.countDocuments({ status: "completed" }),
      ])

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      items: {
        total: totalItems,
        pending: pendingItems,
        approved: approvedItems,
        rejected: totalItems - pendingItems - approvedItems,
      },
      swaps: {
        total: totalSwaps,
        completed: completedSwaps,
        active: totalSwaps - completedSwaps,
      },
    })
  } catch (error) {
    console.error("Get admin stats error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get all users with pagination
router.get(
  "/users",
  adminAuth,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().isLength({ min: 1 }),
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

      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 20
      const skip = (page - 1) * limit

      let filter = {}
      if (req.query.search) {
        filter = {
          $or: [
            { username: { $regex: req.query.search, $options: "i" } },
            { email: { $regex: req.query.search, $options: "i" } },
            { firstName: { $regex: req.query.search, $options: "i" } },
            { lastName: { $regex: req.query.search, $options: "i" } },
          ],
        }
      }

      const users = await User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit)

      const total = await User.countDocuments(filter)

      res.json({
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
      })
    } catch (error) {
      console.error("Get users error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Toggle user active status
router.put("/users/:id/toggle-status", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot deactivate admin users" })
    }

    user.isActive = !user.isActive
    await user.save()

    res.json({
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      user,
    })
  } catch (error) {
    console.error("Toggle user status error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get pending items for approval
router.get(
  "/items/pending",
  adminAuth,
  [query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 50 })],
  async (req, res) => {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 20
      const skip = (page - 1) * limit

      const items = await Item.find({ status: "pending" })
        .populate("owner", "username firstName lastName avatar email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

      const total = await Item.countDocuments({ status: "pending" })

      res.json({
        items,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
      })
    } catch (error) {
      console.error("Get pending items error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Approve or reject item
router.put(
  "/items/:id/review",
  adminAuth,
  [
    body("action").isIn(["approve", "reject"]).withMessage("Action must be approve or reject"),
    body("rejectionReason")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Rejection reason cannot exceed 500 characters"),
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

      const { action, rejectionReason } = req.body

      const item = await Item.findById(req.params.id).populate("owner")

      if (!item) {
        return res.status(404).json({ message: "Item not found" })
      }

      if (item.status !== "pending") {
        return res.status(400).json({ message: "Item has already been reviewed" })
      }

      if (action === "approve") {
        item.status = "approved"
        item.rejectionReason = undefined
      } else {
        item.status = "rejected"
        item.rejectionReason = rejectionReason || "Item does not meet platform guidelines"
        item.isAvailable = false
      }

      await item.save()

      // Emit real-time notification to item owner
      req.io.to(item.owner._id.toString()).emit("item-reviewed", {
        item: item.toObject(),
        message: `Your item "${item.title}" has been ${action}d`,
      })

      res.json({
        message: `Item ${action}d successfully`,
        item,
      })
    } catch (error) {
      console.error("Review item error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get all items with filters
router.get(
  "/items",
  adminAuth,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("status").optional().isIn(["pending", "approved", "rejected", "swapped", "redeemed"]),
    query("search").optional().isLength({ min: 1 }),
  ],
  async (req, res) => {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 20
      const skip = (page - 1) * limit

      const filter = {}

      if (req.query.status) {
        filter.status = req.query.status
      }

      if (req.query.search) {
        filter.$text = { $search: req.query.search }
      }

      const items = await Item.find(filter)
        .populate("owner", "username firstName lastName avatar email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

      const total = await Item.countDocuments(filter)

      res.json({
        items,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
      })
    } catch (error) {
      console.error("Get admin items error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Delete item (admin only)
router.delete("/items/:id", adminAuth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate("owner")

    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }

    // Check if item is involved in active swaps
    const activeSwaps = await Swap.countDocuments({
      $or: [{ requestedItem: req.params.id }, { offeredItem: req.params.id }],
      status: { $in: ["pending", "accepted"] },
    })

    if (activeSwaps > 0) {
      return res.status(400).json({
        message: "Cannot delete item with active swap requests",
      })
    }

    await Item.findByIdAndDelete(req.params.id)

    // Emit notification to item owner
    req.io.to(item.owner._id.toString()).emit("item-deleted", {
      message: `Your item "${item.title}" has been removed by admin`,
    })

    res.json({ message: "Item deleted successfully" })
  } catch (error) {
    console.error("Delete item error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get all swaps
router.get(
  "/swaps",
  adminAuth,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("status").optional().isIn(["pending", "accepted", "rejected", "completed", "cancelled"]),
  ],
  async (req, res) => {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 20
      const skip = (page - 1) * limit

      const filter = {}
      if (req.query.status) {
        filter.status = req.query.status
      }

      const swaps = await Swap.find(filter)
        .populate("requester", "username firstName lastName avatar email")
        .populate("owner", "username firstName lastName avatar email")
        .populate("requestedItem", "title images pointValue")
        .populate("offeredItem", "title images pointValue")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

      const total = await Swap.countDocuments(filter)

      res.json({
        swaps,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
      })
    } catch (error) {
      console.error("Get admin swaps error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

module.exports = router
