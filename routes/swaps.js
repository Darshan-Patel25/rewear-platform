const express = require("express")
const { body, validationResult } = require("express-validator")
const Swap = require("../models/Swap")
const Item = require("../models/Item")
const User = require("../models/User")
const { auth } = require("../middleware/auth")

const router = express.Router()

// Create swap request
router.post(
  "/",
  auth,
  [
    body("requestedItemId").isMongoId().withMessage("Valid item ID is required"),
    body("type").isIn(["swap", "points"]).withMessage("Type must be swap or points"),
    body("offeredItemId").optional().isMongoId().withMessage("Valid offered item ID required for swaps"),
    body("pointsOffered").optional().isInt({ min: 1 }).withMessage("Points offered must be positive"),
    body("message").optional().isLength({ max: 500 }).withMessage("Message cannot exceed 500 characters"),
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

      const { requestedItemId, type, offeredItemId, pointsOffered, message } = req.body

      // Get requested item
      const requestedItem = await Item.findById(requestedItemId).populate("owner")
      if (!requestedItem) {
        return res.status(404).json({ message: "Requested item not found" })
      }

      if (!requestedItem.isAvailable || requestedItem.status !== "approved") {
        return res.status(400).json({ message: "Item is not available for swap" })
      }

      if (requestedItem.owner._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: "Cannot swap your own item" })
      }

      // Check for existing pending swap
      const existingSwap = await Swap.findOne({
        requester: req.user._id,
        requestedItem: requestedItemId,
        status: { $in: ["pending", "accepted"] },
      })

      if (existingSwap) {
        return res.status(400).json({ message: "You already have a pending swap for this item" })
      }

      const swapData = {
        requester: req.user._id,
        owner: requestedItem.owner._id,
        requestedItem: requestedItemId,
        type,
        message,
      }

      if (type === "swap") {
        if (!offeredItemId) {
          return res.status(400).json({ message: "Offered item is required for swaps" })
        }

        const offeredItem = await Item.findById(offeredItemId)
        if (!offeredItem) {
          return res.status(404).json({ message: "Offered item not found" })
        }

        if (offeredItem.owner.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: "You can only offer your own items" })
        }

        if (!offeredItem.isAvailable || offeredItem.status !== "approved") {
          return res.status(400).json({ message: "Offered item is not available" })
        }

        swapData.offeredItem = offeredItemId
      } else {
        if (!pointsOffered || pointsOffered < requestedItem.pointValue) {
          return res.status(400).json({
            message: `Points offered must be at least ${requestedItem.pointValue}`,
          })
        }

        if (req.user.points < pointsOffered) {
          return res.status(400).json({ message: "Insufficient points" })
        }

        swapData.pointsOffered = pointsOffered
      }

      const swap = new Swap(swapData)
      await swap.save()

      await swap.populate([
        { path: "requester", select: "username firstName lastName avatar" },
        { path: "owner", select: "username firstName lastName avatar" },
        { path: "requestedItem", select: "title images pointValue" },
        { path: "offeredItem", select: "title images pointValue" },
      ])

      // Emit real-time notification to item owner
      req.io.to(requestedItem.owner._id.toString()).emit("new-swap-request", {
        swap: swap.toObject(),
        message: `New ${type} request for your item "${requestedItem.title}"`,
      })

      res.status(201).json({
        message: "Swap request created successfully",
        swap,
      })
    } catch (error) {
      console.error("Create swap error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get user's swaps (both sent and received)
router.get("/my-swaps", auth, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const filter = {
      $or: [{ requester: req.user._id }, { owner: req.user._id }],
    }

    if (req.query.status) {
      filter.status = req.query.status
    }

    const swaps = await Swap.find(filter)
      .populate("requester", "username firstName lastName avatar")
      .populate("owner", "username firstName lastName avatar")
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
    console.error("Get swaps error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Respond to swap request
router.put(
  "/:id/respond",
  auth,
  [
    body("action").isIn(["accept", "reject"]).withMessage("Action must be accept or reject"),
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

      const swap = await Swap.findById(req.params.id)
        .populate("requester", "username firstName lastName avatar points")
        .populate("owner", "username firstName lastName avatar points")
        .populate("requestedItem")
        .populate("offeredItem")

      if (!swap) {
        return res.status(404).json({ message: "Swap not found" })
      }

      if (swap.owner._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to respond to this swap" })
      }

      if (swap.status !== "pending") {
        return res.status(400).json({ message: "Swap has already been responded to" })
      }

      if (action === "reject") {
        swap.status = "rejected"
        if (rejectionReason) {
          swap.rejectionReason = rejectionReason
        }
        await swap.save()

        // Emit notification to requester
        req.io.to(swap.requester._id.toString()).emit("swap-rejected", {
          swap: swap.toObject(),
          message: `Your swap request was rejected`,
        })

        return res.json({
          message: "Swap request rejected",
          swap,
        })
      }

      // Accept swap
      if (!swap.requestedItem.isAvailable) {
        return res.status(400).json({ message: "Requested item is no longer available" })
      }

      if (swap.type === "swap" && !swap.offeredItem.isAvailable) {
        return res.status(400).json({ message: "Offered item is no longer available" })
      }

      if (swap.type === "points" && swap.requester.points < swap.pointsOffered) {
        return res.status(400).json({ message: "Requester has insufficient points" })
      }

      swap.status = "accepted"
      await swap.save()

      // Mark items as unavailable
      await Item.findByIdAndUpdate(swap.requestedItem._id, { isAvailable: false })

      if (swap.type === "swap") {
        await Item.findByIdAndUpdate(swap.offeredItem._id, { isAvailable: false })
      }

      // Emit notification to requester
      req.io.to(swap.requester._id.toString()).emit("swap-accepted", {
        swap: swap.toObject(),
        message: `Your swap request was accepted!`,
      })

      res.json({
        message: "Swap request accepted",
        swap,
      })
    } catch (error) {
      console.error("Respond to swap error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Complete swap (mark as completed)
router.put("/:id/complete", auth, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id)
      .populate("requester")
      .populate("owner")
      .populate("requestedItem")
      .populate("offeredItem")

    if (!swap) {
      return res.status(404).json({ message: "Swap not found" })
    }

    // Both parties can mark as complete
    if (
      swap.requester._id.toString() !== req.user._id.toString() &&
      swap.owner._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized to complete this swap" })
    }

    if (swap.status !== "accepted") {
      return res.status(400).json({ message: "Swap must be accepted before completion" })
    }

    // Handle points transfer for points-based swaps
    if (swap.type === "points") {
      await User.findByIdAndUpdate(swap.requester._id, { $inc: { points: -swap.pointsOffered } })

      await User.findByIdAndUpdate(swap.owner._id, { $inc: { points: swap.pointsOffered } })
    }

    // Mark items as swapped/redeemed
    await Item.findByIdAndUpdate(swap.requestedItem._id, {
      status: swap.type === "points" ? "redeemed" : "swapped",
      isAvailable: false,
    })

    if (swap.type === "swap") {
      await Item.findByIdAndUpdate(swap.offeredItem._id, {
        status: "swapped",
        isAvailable: false,
      })
    }

    swap.status = "completed"
    swap.completedAt = new Date()
    await swap.save()

    // Emit notifications
    const otherUserId =
      req.user._id.toString() === swap.requester._id.toString()
        ? swap.owner._id.toString()
        : swap.requester._id.toString()

    req.io.to(otherUserId).emit("swap-completed", {
      swap: swap.toObject(),
      message: "Swap has been completed!",
    })

    res.json({
      message: "Swap completed successfully",
      swap,
    })
  } catch (error) {
    console.error("Complete swap error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Cancel swap request
router.delete("/:id", auth, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id)

    if (!swap) {
      return res.status(404).json({ message: "Swap not found" })
    }

    if (swap.requester.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to cancel this swap" })
    }

    if (swap.status === "completed") {
      return res.status(400).json({ message: "Cannot cancel completed swap" })
    }

    swap.status = "cancelled"
    await swap.save()

    // If swap was accepted, make items available again
    if (swap.status === "accepted") {
      await Item.findByIdAndUpdate(swap.requestedItem, { isAvailable: true })
      if (swap.offeredItem) {
        await Item.findByIdAndUpdate(swap.offeredItem, { isAvailable: true })
      }
    }

    res.json({ message: "Swap cancelled successfully" })
  } catch (error) {
    console.error("Cancel swap error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
