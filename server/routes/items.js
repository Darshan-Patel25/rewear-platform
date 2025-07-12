const express = require("express")
const { body, validationResult, query } = require("express-validator")
const Item = require("../models/Item")
const User = require("../models/User")
const { auth, optionalAuth, checkOwnership, protect } = require("../middleware/auth")
const cloudinary = require("cloudinary").v2
const multer = require("multer")
const path = require("path")

const router = express.Router()

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Multer setup for image upload
const storage = multer.diskStorage({}) // Use empty disk storage to let Cloudinary handle it
const upload = multer({ storage: storage })

// @route   GET /api/items
// @desc    Get all items with filtering and pagination
// @access  Private
router.get(
  "/",
  protect,
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
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate("owner", "username firstName lastName avatar stats")
      .populate("likes", "username firstName lastName")

    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }

    // Increment view count if not the owner
    if (req.user._id.toString() !== item.owner._id.toString()) {
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
  protect,
  upload.array("images", 5), // Allow up to 5 images
  [
    body("name", "Item name is required").notEmpty(),
    body("description", "Description is required").notEmpty(),
    body("category", "Category is required")
      .notEmpty()
      .isIn(["Tops", "Bottoms", "Dresses", "Outerwear", "Footwear", "Accessories", "Other"]),
    body("size", "Size is required").notEmpty().isIn(["XS", "S", "M", "L", "XL", "XXL", "One Size"]),
    body("condition", "Condition is required")
      .notEmpty()
      .isIn(["New with tags", "Like new", "Gently used", "Used", "Fair"]),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { name, description, category, size, condition } = req.body

    try {
      const images = []
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "rewear_items", // Optional: folder in Cloudinary
          })
          images.push({ url: result.secure_url, public_id: result.public_id })
        }
      } else {
        // Add a default placeholder image if no images are uploaded
        images.push({
          url: "https://res.cloudinary.com/your_cloud_name/image/upload/v1/placeholder.png", // Replace with your actual placeholder URL
          public_id: "placeholder_item_default",
        })
      }

      const newItem = new Item({
        owner: req.user.id,
        name,
        description,
        category,
        size,
        condition,
        images,
      })

      const item = await newItem.save()

      // Add item to user's itemsListed
      await User.findByIdAndUpdate(req.user.id, { $push: { itemsListed: item._id } })

      res.status(201).json({ message: "Item created successfully", item })
    } catch (err) {
      console.error(err.message)
      res.status(500).send("Server error")
    }
  },
)

// @route   PUT /api/items/:id
// @desc    Update item
// @access  Private (Owner only)
router.put(
  "/:id",
  protect,
  upload.array("images", 5),
  [
    body("name", "Item name is required").optional().notEmpty(),
    body("description", "Description is required").optional().notEmpty(),
    body("category", "Category is required")
      .optional()
      .notEmpty()
      .isIn(["Tops", "Bottoms", "Dresses", "Outerwear", "Footwear", "Accessories", "Other"]),
    body("size", "Size is required").optional().notEmpty().isIn(["XS", "S", "M", "L", "XL", "XXL", "One Size"]),
    body("condition", "Condition is required")
      .optional()
      .notEmpty()
      .isIn(["New with tags", "Like new", "Gently used", "Used", "Fair"]),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { name, description, category, size, condition, isAvailable } = req.body

    try {
      const item = await Item.findById(req.params.id)

      if (!item) {
        return res.status(404).json({ message: "Item not found" })
      }

      // Check if user owns the item
      if (item.owner.toString() !== req.user.id) {
        return res.status(401).json({ message: "Not authorized to update this item" })
      }

      // Handle image updates
      if (req.files && req.files.length > 0) {
        // Delete old images from Cloudinary
        for (const img of item.images) {
          await cloudinary.uploader.destroy(img.public_id)
        }
        // Upload new images
        const newImages = []
        for (const file of req.files) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "rewear_items",
          })
          newImages.push({ url: result.secure_url, public_id: result.public_id })
        }
        item.images = newImages
      }

      item.name = name || item.name
      item.description = description || item.description
      item.category = category || item.category
      item.size = size || item.size
      item.condition = condition || item.condition
      if (typeof isAvailable === "boolean") {
        item.isAvailable = isAvailable
      }

      await item.save()
      res.json({ message: "Item updated successfully", item })
    } catch (err) {
      console.error(err.message)
      res.status(500).send("Server error")
    }
  },
)

// @route   DELETE /api/items/:id
// @desc    Delete item
// @access  Private (Owner only)
router.delete("/:id", protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)

    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }

    // Check if user owns the item
    if (item.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to delete this item" })
    }

    // Delete images from Cloudinary
    for (const img of item.images) {
      await cloudinary.uploader.destroy(img.public_id)
    }

    await Item.deleteOne({ _id: req.params.id })

    // Remove item from user's itemsListed
    await User.findByIdAndUpdate(req.user.id, { $pull: { itemsListed: req.params.id } })

    res.json({ message: "Item removed successfully" })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// @route   PUT /api/items/like/:id
// @desc    Like an item
// @access  Private
router.put("/like/:id", protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)

    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }

    // Check if the item has already been liked by this user
    if (item.likes.includes(req.user.id)) {
      return res.status(400).json({ message: "Item already liked" })
    }

    item.likes.push(req.user.id)
    await item.save()

    res.json({ message: "Item liked", likes: item.likes.length })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// @route   PUT /api/items/unlike/:id
// @desc    Unlike an item
// @access  Private
router.put("/unlike/:id", protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)

    if (!item) {
      return res.status(404).json({ message: "Item not found" })
    }

    // Check if the item has not yet been liked by this user
    if (!item.likes.includes(req.user.id)) {
      return res.status(400).json({ message: "Item has not yet been liked" })
    }

    item.likes = item.likes.filter((like) => like.toString() !== req.user.id)
    await item.save()

    res.json({ message: "Item unliked", likes: item.likes.length })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// @route   POST /api/items/:id/report
// @desc    Report an item
// @access  Private
router.post(
  "/:id/report",
  protect,
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
// @access  Private
router.get(
  "/user/:userId",
  protect,
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

      const items = await Item.find(filter).populate("owner", "username email profilePicture").sort({ createdAt: -1 })

      res.json({ items })
    } catch (error) {
      console.error("Get user items error:", error)
      res.status(500).json({ message: "Server error while fetching user items" })
    }
  },
)

module.exports = router
