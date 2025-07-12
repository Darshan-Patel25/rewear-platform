const express = require("express")
const { body, validationResult, query } = require("express-validator")
const Swap = require("../models/Swap")
const Item = require("../models/User")
const User = require("../models/User")
const { auth, protect, authorize } = require("../middleware/auth")
const { getSwaps, getSwap, createSwap, updateSwapStatus, deleteSwap } = require("../controllers/swaps")

const router = express.Router()

// Helper function to emit socket events
const emitSocketEvent = (req, eventName, data) => {
  const io = req.app.get("socketio")
  if (io) {
    io.emit(eventName, data) // Emits to all connected clients
    // For targeted notifications, you might use io.to(userId).emit(...)
  }
}

// @route   GET /api/swaps
// @desc    Get all swaps (for a user, or all if admin)
// @access  Private
router.get("/", protect, getSwaps)

// @route   GET /api/swaps/my-swaps
// @desc    Get all swaps involving the authenticated user
// @access  Private
router.get("/my-swaps", protect, async (req, res) => {
  try {
    const userId = req.user.id
    const swaps = await Swap.find({
      $or: [{ initiator: userId }, { receiver: userId }],
    })
      .populate("initiator", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .populate("initiatorItem", "name images")
      .populate("receiverItem", "name images")
      .sort({ createdAt: -1 })

    res.json(swaps)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// @route   POST /api/swaps
// @desc    Create a new swap request
// @access  Private
router.post("/", protect, createSwap)

// @route   GET /api/swaps/:id
// @desc    Get single swap by ID
// @access  Private
router.get("/:id", protect, getSwap)

// @route   PUT /api/swaps/:id/accept
// @desc    Accept a swap request
// @access  Private (owner of requested item only)
router.put("/:id/accept", protect, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id).populate("requestedItem")

    if (!swap) {
      return res.status(404).json({ message: "Swap not found" })
    }

    if (swap.requestedItem.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to accept this swap" })
    }

    if (swap.status !== "pending") {
      return res.status(400).json({ message: `Swap is already ${swap.status}` })
    }

    swap.status = "accepted"
    swap.updatedAt = Date.now()
    await swap.save()

    // Mark items as unavailable (or swapped)
    await Item.findByIdAndUpdate(swap.requestedItem._id, { isAvailable: false })
    if (swap.offeredItem) {
      await Item.findByIdAndUpdate(swap.offeredItem, { isAvailable: false })
    }

    // Emit socket event to the requester
    emitSocketEvent(req, "swapAccepted", {
      swapId: swap._id,
      requesterId: swap.requester,
      accepterName: req.user.username,
      itemName: swap.requestedItem.name,
      message: `Your swap request for ${swap.requestedItem.name} was accepted!`,
    })

    res.status(200).json(swap)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/swaps/:id/decline
// @desc    Decline a swap request
// @access  Private (owner of requested item only)
router.put("/:id/decline", protect, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id).populate("requestedItem")

    if (!swap) {
      return res.status(404).json({ message: "Swap not found" })
    }

    if (swap.requestedItem.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to decline this swap" })
    }

    if (swap.status !== "pending") {
      return res.status(400).json({ message: `Swap is already ${swap.status}` })
    }

    swap.status = "declined"
    swap.updatedAt = Date.now()
    await swap.save()

    // Emit socket event to the requester
    emitSocketEvent(req, "swapDeclined", {
      swapId: swap._id,
      requesterId: swap.requester,
      declinerName: req.user.username,
      itemName: swap.requestedItem.name,
      message: `Your swap request for ${swap.requestedItem.name} was declined.`,
    })

    res.status(200).json(swap)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/swaps/:id/complete
// @desc    Mark a swap as completed
// @access  Private (either participant can mark as complete)
router.put("/:id/complete", protect, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id).populate("requester").populate("requestedItem")

    if (!swap) {
      return res.status(404).json({ message: "Swap not found" })
    }

    const isParticipant =
      swap.requester._id.toString() === req.user.id || swap.requestedItem.owner.toString() === req.user.id

    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized to complete this swap" })
    }

    if (swap.status !== "accepted") {
      return res
        .status(400)
        .json({ message: `Swap must be 'accepted' to be completed. Current status: ${swap.status}` })
    }

    swap.status = "completed"
    swap.updatedAt = Date.now()
    await swap.save()

    // Emit socket event to both participants
    const otherParticipantId =
      swap.requester._id.toString() === req.user.id ? swap.requestedItem.owner : swap.requester._id
    emitSocketEvent(req, "swapCompleted", {
      swapId: swap._id,
      participant1: req.user.id,
      participant2: otherParticipantId,
      itemName: swap.requestedItem.name,
      message: `Swap for ${swap.requestedItem.name} completed!`,
    })

    res.status(200).json(swap)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/swaps/:id/status
// @desc    Update swap status (accept, reject, complete, cancel)
// @access  Private (initiator or receiver)
router.put(
  "/:id/status",
  protect,
  [body("status", "Invalid status").isIn(["accepted", "rejected", "completed", "cancelled"])],
  updateSwapStatus,
)

// @route   POST /api/swaps/:id/message
// @desc    Add message to swap conversation
// @access  Private
router.post(
  "/:id/message",
  protect,
  [body("message").trim().isLength({ min: 1, max: 1000 }).withMessage("Message must be between 1 and 1000 characters")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const swap = await Swap.findById(req.params.id)

      if (!swap) {
        return res.status(404).json({ message: "Swap not found" })
      }

      if (!swap.isParticipant(req.user._id)) {
        return res.status(403).json({ message: "Access denied" })
      }

      await swap.addMessage(req.user._id, req.body.message)

      // Notify other participant
      const otherParticipant = swap.getOtherParticipant(req.user._id)
      const io = req.app.get("io")
      if (io && otherParticipant) {
        io.to(otherParticipant.toString()).emit("new-message", {
          swapId: swap._id,
          message: req.body.message,
          sender: req.user._id,
        })
      }

      res.json({
        message: "Message sent successfully",
      })
    } catch (error) {
      console.error("Send message error:", error)
      res.status(500).json({ message: "Server error while sending message" })
    }
  },
)

// @route   PUT /api/swaps/:id/read
// @desc    Mark messages as read
// @access  Private
router.put("/:id/read", protect, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id)

    if (!swap) {
      return res.status(404).json({ message: "Swap not found" })
    }

    if (!swap.isParticipant(req.user._id)) {
      return res.status(403).json({ message: "Access denied" })
    }

    await swap.markMessagesAsRead(req.user._id)

    res.json({
      message: "Messages marked as read",
    })
  } catch (error) {
    console.error("Mark messages read error:", error)
    res.status(500).json({ message: "Server error while marking messages as read" })
  }
})

// @route   DELETE /api/swaps/:id
// @desc    Cancel swap request
// @access  Private
router.delete("/:id", protect, deleteSwap)

// Route to get swaps for a specific user (either as requester or owner)
router.route("/user/:userId").get(protect, getSwaps) // Reusing getSwaps with a user filter

module.exports = router
