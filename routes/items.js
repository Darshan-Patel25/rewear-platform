const express = require("express")
const { body, validationResult, query } = require("express-validator")
const Item = require("../models/Item")
const User = require("../models/User")
const { auth } = require("../middleware/auth")

const router = express.Router()

// Get all approved items with filtering and pagination
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
    query("category")
      .optional()
      .isIn(["tops", "bottoms", "dresses", "outerwear", "shoes", "accessories", "activewear", "formal"]),
    query("size").optional().isIn(["XS", "S", "M", "L", "XL", "XXL", "6", "7", "8", "9", "10", "11", "12", "One Size"]),
    query("condition").optional().isIn(["new", "like-new", "good", "fair"]),
    query("minPoints").optional().isInt({ min: 0 }),
    query("maxPoints").optional().isInt({ min: 0 }),
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
      const limit = Number.parseInt(req.query.limit) || 12
      const skip = (page - 1) * limit

      // Build filter object
      const filter = {
        status: "approved",
        isAvailable: true,
      }

      if (req.query.category) filter.category = req.query.category
      if (req.query.size) filter.size = req.query.size
      if (req.query.condition) filter.condition = req.query.condition
      if (req.query.search) {
        filter.$text = { $search: req.query.search }
      }
      if (req.query.minPoints || req.query.maxPoints) {
        filter.pointValue = {}
        if (req.query.minPoints) filter.pointValue.$gte = Number.parseInt(req.query.minPoints)
        if (req.query.maxPoints) filter.pointValue.$lte = Number.parseInt(req.query.maxPoints)
      }

      // Build sort object
      let sort = { createdAt: -1 }
      if (req.query.sortBy) {
        switch (req.query.sortBy) {
          case "points-low":
            sort = { pointValue: 1 }
            break
          case "points-high":
            sort = { pointValue: -1 }
            break
          case "newest":
            sort = { createdAt: -1 }
            break
          case "oldest":
            sort = { createdAt: 1 }
            break
          case "popular":
            sort = { views: -1, likes: -1 }
            break
        }
      }

      const items = await Item.find(filter)
        .populate("owner", "username firstName lastName avatar")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()

      const total = await Item.countDocuments(filter)
      const totalPages = Math.ceil(total / limit)

      res.json({
        items,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error("Get items error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get featured items
router.get("/featured", async (req, res) => {
  try {
    const items = await Item.find({
      status: "approved",
      isAvailable: true,
    })
      .populate("owner", "username firstName lastName avatar")
      .sort({ views: -1, likes: -1, createdAt: -1 })
      .limit(8)
      .lean()

    res.json({ items })
  } catch (error) {
    console.error("Get featured items error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get single item
router.get("/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate("owner", "username firstName lastName avatar points")
      .populate("likes", "username")

    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }

    // Increment view count
    await Item.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } })

    res.json({ item })
  } catch (error) {
    console.error("Get item error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create new item
router.post(
  "/",
  auth,
  [
    body("title").notEmpty().isLength({ max: 100 }).withMessage("Title is required and must be under 100 characters"),
    body("description")
      .notEmpty()
      .isLength({ max: 1000 })
      .withMessage("Description is required and must be under 1000 characters"),
    body("category").isIn(["tops", "bottoms", "dresses", "outerwear", "shoes", "accessories", "activewear", "formal"]),
    body("type").notEmpty().withMessage("Type is required"),
    body("size").isIn(["XS", "S", "M", "L", "XL", "XXL", "6", "7", "8", "9", "10", "11", "12", "One Size"]),
    body("condition").isIn(["new", "like-new", "good", "fair"]),
    body("color").notEmpty().withMessage("Color is required"),
    body("pointValue").isInt({ min: 1, max: 500 }).withMessage("Point value must be between 1 and 500"),
    body("images").isArray({ min: 1 }).withMessage("At least one image is required"),
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
        tags: req.body.tags || [],
      }

      const item = new Item(itemData)
      await item.save()

      await item.populate("owner", "username firstName lastName avatar")

      // Emit real-time notification to admins
      req.io.emit("new-item-pending", {
        item: item.toObject(),
        message: `New item "${item.title}" submitted for review`,
      })

      res.status(201).json({
        message: "Item created successfully and pending approval",
        item,
      })
    } catch (error) {
      console.error("Create item error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Update item (only owner can update)
router.put(
  "/:id",
  auth,
  [
    body("title").optional().isLength({ max: 100 }),
    body("description").optional().isLength({ max: 1000 }),
    body("pointValue").optional().isInt({ min: 1, max: 500 }),
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

      if (item.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to update this item" })
      }

      if (item.status === "swapped" || item.status === "redeemed") {
        return res.status(400).json({ message: "Cannot update completed items" })
      }

      const allowedUpdates = ["title", "description", "pointValue", "tags", "images"]
      const updates = {}

      Object.keys(req.body).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key]
        }
      })

      // Reset status to pending if item was previously rejected
      if (item.status === "rejected") {
        updates.status = "pending"
        updates.rejectionReason = undefined
      }

      const updatedItem = await Item.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      }).populate("owner", "username firstName lastName avatar")

      res.json({
        message: "Item updated successfully",
        item: updatedItem,
      })
    } catch (error) {
      console.error("Update item error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Toggle like item
router.post("/:id/like", auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)

    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }

    const userId = req.user._id
    const isLiked = item.likes.includes(userId)

    if (isLiked) {
      item.likes.pull(userId)
    } else {
      item.likes.push(userId)
    }

    await item.save()

    res.json({
      message: isLiked ? "Item unliked" : "Item liked",
      isLiked: !isLiked,
      likesCount: item.likes.length,
    })
  } catch (error) {
    console.error("Toggle like error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete item (only owner can delete)
router.delete("/:id", auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)

    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }

    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this item" })
    }

    if (item.status === "swapped" || item.status === "redeemed") {
      return res.status(400).json({ message: "Cannot delete completed items" })
    }

    await Item.findByIdAndDelete(req.params.id)

    res.json({ message: "Item deleted successfully" })
  } catch (error) {
    console.error("Delete item error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get user's items
router.get("/user/:userId", async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 12
    const skip = (page - 1) * limit

    const filter = { owner: req.params.userId }

    // If not the owner, only show approved and available items
    if (!req.user || req.user._id.toString() !== req.params.userId) {
      filter.status = "approved"
      filter.isAvailable = true
    }

    const items = await Item.find(filter)
      .populate("owner", "username firstName lastName avatar")
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
    console.error("Get user items error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
