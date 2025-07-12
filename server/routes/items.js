const express = require("express")
const { body, validationResult, query } = require("express-validator")
const Item = require("../models/Item")
const User = require("../models/User")
const { auth, optionalAuth, checkOwnership } = require("../middleware/auth")

const router = express.Router()

// @route   GET /api/items
// @desc    Get all items with filtering and pagination
// @access  Public
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
    query("category").optional().isIn(["tops", "bottoms", "dresses", "outerwear", "shoes", "accessories"]),
    query("condition").optional().isIn(["new", "like-new", "good", "fair"]),
    query("minPoints").optional().isInt({ min: 1 }).withMessage("Min points must be positive"),
    query("maxPoints").optional().isInt({ min: 1 }).withMessage("Max points must be positive"),
    query("size").optional().trim(),
    query("search").optional().trim(),
    query("sortBy").optional().isIn(["newest", "oldest", "points-low", "points-high", "popular"]),
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

      const {
        page = 1,
        limit = 12,
        category,
        condition,
        minPoints,
        maxPoints,
        size,
        search,
        sortBy = "newest",
      } = req.query

      // Build filter query
      const filter = { status: "available" }

      if (category) filter.category = category
      if (condition) filter.condition = condition
      if (size) filter.size = new RegExp(size, "i")

      if (minPoints || maxPoints) {
        filter.pointValue = {}
        if (minPoints) filter.pointValue.$gte = Number.parseInt(minPoints)
        if (maxPoints) filter.pointValue.$lte = Number.parseInt(maxPoints)
      }

      // Build sort query
      let sort = {}
      switch (sortBy) {
        case "oldest":
          sort = { createdAt: 1 }
          break
        case "points-low":
          sort = { pointValue: 1 }
          break
        case "points-high":
          sort = { pointValue: -1 }
          break
        case "popular":
          sort = { views: -1, likes: -1 }
          break
        default:
          sort = { createdAt: -1 }
      }

      let query

      if (search) {
        // Use text search if search query provided
        query = Item.find(
          {
            ...filter,
            $text: { $search: search },
          },
          {
            score: { $meta: "textScore" },
          },
        ).sort({ score: { $meta: "textScore" }, ...sort })
      } else {
        query = Item.find(filter).sort(sort)
      }

      const items = await query
        .populate("owner", "username firstName lastName avatar")
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean()

      const total = await Item.countDocuments(
        search
          ? {
              ...filter,
              $text: { $search: search },
            }
          : filter,
      )

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
      console.error("Get items error:", error)
      res.status(500).json({ message: "Server error while fetching items" })
    }
  },
)

// @route   GET /api/items/featured
// @desc    Get featured items
// @access  Public
router.get("/featured", async (req, res) => {
  try {
    const items = await Item.getFeatured(8)
    res.json({ items })
  } catch (error) {
    console.error("Get featured items error:", error)
    res.status(500).json({ message: "Server error while fetching featured items" })
  }
})

// @route   GET /api/items/:id
// @desc    Get single item by ID
// @access  Public
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate("owner", "username firstName lastName avatar stats")
      .populate("likes", "username firstName lastName")

    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }

    // Increment view count if not the owner
    if (!req.user || item.owner._id.toString() !== req.user._id.toString()) {
      await item.incrementViews()
    }

    res.json({ item })
  } catch (error) {
    console.error("Get item error:", error)
    res.status(500).json({ message: "Server error while fetching item" })
  }
})

// @route   POST /api/items
// @desc    Create new item
// @access  Private
router.post(
  "/",
  auth,
  [
    body("title")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Title is required and cannot exceed 100 characters"),
    body("description")
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Description must be between 10 and 1000 characters"),
    body("category")
      .isIn(["tops", "bottoms", "dresses", "outerwear", "shoes", "accessories"])
      .withMessage("Invalid category"),
    body("size").trim().isLength({ min: 1 }).withMessage("Size is required"),
    body("condition").isIn(["new", "like-new", "good", "fair"]).withMessage("Invalid condition"),
    body("pointValue").isInt({ min: 1, max: 500 }).withMessage("Point value must be between 1 and 500"),
    body("images").isArray({ min: 1, max: 5 }).withMessage("At least 1 image is required, maximum 5 images allowed"),
    body("images.*.url").isURL().withMessage("Invalid image URL"),
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

      const itemData = {
        ...req.body,
        owner: req.user._id,
      }

      const item = new Item(itemData)
      await item.save()

      // Update user stats
      await req.user.updateStats("itemListed")

      const populatedItem = await Item.findById(item._id).populate("owner", "username firstName lastName avatar")

      res.status(201).json({
        message: "Item created successfully",
        item: populatedItem,
      })
    } catch (error) {
      console.error("Create item error:", error)
      res.status(500).json({ message: "Server error while creating item" })
    }
  },
)

// @route   PUT /api/items/:id
// @desc    Update item
// @access  Private (Owner only)
router.put(
  "/:id",
  auth,
  checkOwnership(Item),
  [
    body("title").optional().trim().isLength({ min: 1, max: 100 }).withMessage("Title cannot exceed 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Description must be between 10 and 1000 characters"),
    body("category")
      .optional()
      .isIn(["tops", "bottoms", "dresses", "outerwear", "shoes", "accessories"])
      .withMessage("Invalid category"),
    body("size").optional().trim().isLength({ min: 1 }).withMessage("Size cannot be empty"),
    body("condition").optional().isIn(["new", "like-new", "good", "fair"]).withMessage("Invalid condition"),
    body("pointValue").optional().isInt({ min: 1, max: 500 }).withMessage("Point value must be between 1 and 500"),
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

      const item = req.resource

      // Check if item can be edited
      if (!item.canEdit(req.user._id)) {
        return res.status(400).json({
          message: "Item cannot be edited in its current status",
        })
      }

      // Update allowed fields
      const allowedUpdates = [
        "title",
        "description",
        "category",
        "subcategory",
        "brand",
        "size",
        "condition",
        "color",
        "material",
        "pointValue",
        "tags",
        "measurements",
        "originalPrice",
        "purchaseDate",
        "shippingOptions",
      ]

      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          item[field] = req.body[field]
        }
      })

      // Reset status to pending if item was rejected
      if (item.status === "rejected") {
        item.status = "pending"
        item.rejectionReason = undefined
      }

      await item.save()

      const updatedItem = await Item.findById(item._id).populate("owner", "username firstName lastName avatar")

      res.json({
        message: "Item updated successfully",
        item: updatedItem,
      })
    } catch (error) {
      console.error("Update item error:", error)
      res.status(500).json({ message: "Server error while updating item" })
    }
  },
)

// @route   DELETE /api/items/:id
// @desc    Delete item
// @access  Private (Owner only)
router.delete("/:id", auth, checkOwnership(Item), async (req, res) => {
  try {
    const item = req.resource

    // Check if item can be deleted
    if (!["pending", "rejected", "available"].includes(item.status)) {
      return res.status(400).json({
        message: "Item cannot be deleted in its current status",
      })
    }

    await Item.findByIdAndDelete(item._id)

    res.json({ message: "Item deleted successfully" })
  } catch (error) {
    console.error("Delete item error:", error)
    res.status(500).json({ message: "Server error while deleting item" })
  }
})

// @route   POST /api/items/:id/like
// @desc    Toggle like on item
// @access  Private
router.post("/:id/like", auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)

    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }

    if (item.status !== "available") {
      return res.status(400).json({ message: "Cannot like unavailable item" })
    }

    await item.toggleLike(req.user._id)

    res.json({
      message: "Like toggled successfully",
      liked: item.likes.includes(req.user._id),
      likeCount: item.likes.length,
    })
  } catch (error) {
    console.error("Toggle like error:", error)
    res.status(500).json({ message: "Server error while toggling like" })
  }
})

// @route   POST /api/items/:id/report
// @desc    Report an item
// @access  Private
router.post(
  "/:id/report",
  auth,
  [
    body("reason").isIn(["inappropriate", "spam", "fake", "damaged", "other"]).withMessage("Invalid report reason"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
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

      const item = await Item.findById(req.params.id)

      if (!item) {
        return res.status(404).json({ message: "Item not found" })
      }

      // Check if user already reported this item
      const existingReport = item.reports.find((report) => report.user.toString() === req.user._id.toString())

      if (existingReport) {
        return res.status(400).json({ message: "You have already reported this item" })
      }

      item.reports.push({
        user: req.user._id,
        reason: req.body.reason,
        description: req.body.description,
      })

      await item.save()

      // Notify admins via socket if available
      const io = req.app.get("io")
      if (io) {
        io.emit("admin-notification", {
          type: "item-reported",
          itemId: item._id,
          reportCount: item.reports.length,
        })
      }

      res.json({ message: "Item reported successfully" })
    } catch (error) {
      console.error("Report item error:", error)
      res.status(500).json({ message: "Server error while reporting item" })
    }
  },
)

// @route   GET /api/items/user/:userId
// @desc    Get items by user
// @access  Public
router.get(
  "/user/:userId",
  [query("status").optional().isIn(["pending", "approved", "rejected", "available", "reserved", "swapped"])],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { userId } = req.params
      const { status } = req.query

      // Build filter
      const filter = { owner: userId }
      if (status) {
        filter.status = status
      } else {
        // Only show available items for public view
        filter.status = "available"
      }

      const items = await Item.find(filter)
        .populate("owner", "username firstName lastName avatar")
        .sort({ createdAt: -1 })

      res.json({ items })
    } catch (error) {
      console.error("Get user items error:", error)
      res.status(500).json({ message: "Server error while fetching user items" })
    }
  },
)

module.exports = router
