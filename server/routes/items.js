const express = require("express")
const { body, validationResult, query } = require("express-validator")
const Item = require("../models/Item")
const User = require("../models/User")
const { auth, optionalAuth, checkOwnership, protect, authorize } = require("../middleware/auth")
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

// Controllers
const { getItems, getItem, createItem, updateItem, deleteItem } = require("../controllers/items")

// @route   GET /api/items
// @desc    Get all items with filtering and pagination
// @access  Private
router.get("/", protect, getItems)

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
router.get("/:id", protect, getItem)

// @route   POST /api/items
// @desc    Create new item
// @access  Private
router.post("/", protect, upload.array("images", 5), createItem) // Allow up to 5 images

// @route   PUT /api/items/:id
// @desc    Update item
// @access  Private (Owner only)
router.put("/:id", protect, upload.array("images", 5), updateItem)

// @route   DELETE /api/items/:id
// @desc    Delete item
// @access  Private (Owner only)
router.delete("/:id", protect, deleteItem)

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

// Route to get items by a specific user
router.route("/user/:userId").get(getItems) // Reusing getItems with a user filter

module.exports = router
