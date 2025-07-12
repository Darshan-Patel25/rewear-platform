const express = require("express")
const { body, validationResult, query } = require("express-validator")
const Item = require("../models/Item")
const User = require("../models/User")
const { auth } = require("../middleware/auth")

const router = express.Router()

// @route   GET /api/items
// @desc    Get all approved items with filtering and pagination
// @access  Public
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
    query("category")
      .optional()
      .isIn([
        "tops",
        "bottoms",
        "dresses",
        "outerwear",
        "shoes",
        "accessories",
        "activewear",
        "formal",
        "casual",
        "vintage",
      ]),
    query("size").optional().isIn(["XS", "S", "M", "L", "XL", "XXL", "6", "7", "8", "9", "10", "11", "12", "One Size"]),
    query("condition").optional().isIn(["new", "like-new", "good", "fair", "worn"]),
    query("minPoints").optional().isInt({ min: 1 }),
    query("maxPoints").optional().isInt({ min: 1 }),
    query("search").optional().isLength({ min: 1, max: 100 }),
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
        availability: "available",
      }

      if (req.query.category) filter.category = req.query.category
      if (req.query.size) filter.size = req.query.size
      if (req.query.condition) filter.condition = req.query.condition
      if (req.query.minPoints || req.query.maxPoints) {
        filter.pointValue = {}
        if (req.query.minPoints) filter.pointValue.$gte = Number.parseInt(req.query.minPoints)
        if (req.query.maxPoints) filter.pointValue.$lte = Number.parseInt(req.query.maxPoints)
      }

      // Text search
      if (req.query.search) {
        filter.$text = { $search: req.query.search }
      }

      // Sort options
      let sort = { createdAt: -1 } // Default: newest first
      if (req.query.sort === "points-low") sort = { pointValue: 1 }
      if (req.query.sort === "points-high") sort = { pointValue: -1 }
      if (req.query.sort === "popular") sort = { views: -1, likes: -1 }

      const items = await Item.find(filter)
        .populate("owner", "username firstName lastName avatar location")
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
      res.status(500).json({ message: "Server error while fetching items" })
    }
  },
)

// @route   GET /api/items/:id
// @desc    Get single item by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate("owner", "username firstName lastName avatar location stats")
      .populate("likes", "username")

    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }

    // Increment view count
    await Item.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } })

    res.json(item)
  } catch (error) {
    console.error("Get item error:", error)
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Item not found" })
    }
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
    body("title").trim().isLength({ min: 1, max: 100 }).withMessage("Title must be between 1 and 100 characters"),
    body("description")
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Description must be between 10 and 1000 characters"),
    body("category").isIn([
      "tops",
      "bottoms",
      "dresses",
      "outerwear",
      "shoes",
      "accessories",
      "activewear",
      "formal",
      "casual",
      "vintage",
    ]),
    body("type").isIn([
      "shirt",
      "blouse",
      "sweater",
      "jacket",
      "coat",
      "jeans",
      "pants",
      "shorts",
      "skirt",
      "dress",
      "sneakers",
      "boots",
      "heels",
      "sandals",
      "bag",
      "jewelry",
      "hat",
      "scarf",
      "belt",
      "other",
    ]),
    body("size").isIn(["XS", "S", "M", "L", "XL", "XXL", "6", "7", "8", "9", "10", "11", "12", "One Size"]),
    body("condition").isIn(["new", "like-new", "good", "fair", "worn"]),
    body("color").trim().notEmpty().withMessage("Color is required"),
    body("brand").optional().trim(),
    body("material").optional().trim(),
    body("tags").optional().isArray(),
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

      const itemData = {
        ...req.body,
        owner: req.user._id,
        location: req.user.location,
      }

      const item = new Item(itemData)
      await item.save()

      // Update user stats
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { "stats.itemsListed": 1 },
      })

      // Populate owner info for response
      await item.populate("owner", "username firstName lastName avatar")

      // Emit real-time notification to admins
      req.io.emit("new-item-pending", {
        item: item.toObject(),
        message: `New item "${item.title}" submitted for review`,
      })

      res.status(201).json({
        message: "Item created successfully and submitted for review",
        item,
      })
    } catch (error) {
      console.error("Create item error:", error)
      res.status(500).json({ message: "Server error while creating item" })
    }
  },
)

// @route   PUT /api/items/:id
// @desc    Update item (owner only)
// @access  Private
router.put(
  "/:id",
  auth,
  [
    body("title").optional().trim().isLength({ min: 1, max: 100 }),
    body("description").optional().trim().isLength({ min: 10, max: 1000 }),
    body("category")
      .optional()
      .isIn([
        "tops",
        "bottoms",
        "dresses",
        "outerwear",
        "shoes",
        "accessories",
        "activewear",
        "formal",
        "casual",
        "vintage",
      ]),
    body("condition").optional().isIn(["new", "like-new", "good", "fair", "worn"]),
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

      // Check ownership
      if (item.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to update this item" })
      }

      // Don't allow updates if item is in a swap
      if (item.availability !== "available") {
        return res.status(400).json({ message: "Cannot update item that is not available" })
      }

      const allowedUpdates = [
        "title",
        "description",
        "category",
        "condition",
        "color",
        "brand",
        "material",
        "tags",
        "pointValue",
      ]
      const updates = {}

      Object.keys(req.body).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key]
        }
      })

      // Reset status to pending if significant changes made
      const significantFields = ["title", "description", "category", "condition"]
      if (significantFields.some((field) => updates[field])) {
        updates.status = "pending"
      }

      const updatedItem = await Item.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true },
      ).populate("owner", "username firstName lastName avatar")

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
// @desc    Delete item (owner only)
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)

    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }

    // Check ownership
    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this item" })
    }

    // Don't allow deletion if item is in a swap
    if (item.availability === "pending-swap") {
      return res.status(400).json({ message: "Cannot delete item that is in a pending swap" })
    }

    await Item.findByIdAndDelete(req.params.id)

    res.json({ message: "Item deleted successfully" })
  } catch (error) {
    console.error("Delete item error:", error)
    res.status(500).json({ message: "Server error while deleting item" })
  }
})

// @route   POST /api/items/:id/like
// @desc    Like/unlike an item
// @access  Private
router.post("/:id/like", auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)

    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }

    const userId = req.user._id
    const isLiked = item.likes.includes(userId)

    if (isLiked) {
      // Unlike
      item.likes = item.likes.filter((id) => id.toString() !== userId.toString())
    } else {
      // Like
      item.likes.push(userId)
    }

    await item.save()

    res.json({
      message: isLiked ? "Item unliked" : "Item liked",
      isLiked: !isLiked,
      likesCount: item.likes.length,
    })
  } catch (error) {
    console.error("Like item error:", error)
    res.status(500).json({ message: "Server error while liking item" })
  }
})

// @route   GET /api/items/user/:userId
// @desc    Get items by user
// @access  Public
router.get("/user/:userId", async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 12
    const skip = (page - 1) * limit

    const items = await Item.find({
      owner: req.params.userId,
      status: "approved",
    })
      .populate("owner", "username firstName lastName avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Item.countDocuments({
      owner: req.params.userId,
      status: "approved",
    })

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
    res.status(500).json({ message: "Server error while fetching user items" })
  }
})

module.exports = router
