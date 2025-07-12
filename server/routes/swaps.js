const express = require("express")
const { body, validationResult, query } = require("express-validator")
const Swap = require("../models/Swap")
const Item = require("../models/Item")
const User = require("../models/User")
const { auth, protect } = require("../middleware/auth")

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
router.get("/", protect, async (req, res) => {
  try {
    let swaps
    if (req.user.isAdmin) {
      swaps = await Swap.find()
        .populate("requester", "username email")
        .populate("requestedItem", "name owner")
        .populate("offeredItem", "name owner")
    } else {
      // Get swaps where user is requester or owner of requested/offered item
      swaps = await Swap.find({
        $or: [
          { requester: req.user.id },
          { "requestedItem.owner": req.user.id }, // This requires a lookup or pre-population
          { "offeredItem.owner": req.user.id },
        ],
      })
        .populate("requester", "username email")
        .populate("requestedItem", "name owner")
        .populate("offeredItem", "name owner")

      // Further filter if populate doesn't handle the owner check directly in the query
      swaps = swaps.filter(
        (swap) =>
          swap.requester._id.toString() === req.user.id ||
          (swap.requestedItem && swap.requestedItem.owner.toString() === req.user.id) ||
          (swap.offeredItem && swap.offeredItem.owner.toString() === req.user.id),
      )
    }
    res.status(200).json(swaps)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

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
router.post("/", protect, async (req, res) => {
  const { requestedItemId, offeredItemId, message } = req.body

  try {
    const requestedItem = await Item.findById(requestedItemId)
    if (!requestedItem) {
      return res.status(404).json({ message: "Requested item not found" })
    }

    if (requestedItem.owner.toString() === req.user.id) {
      return res.status(400).json({ message: "Cannot request a swap for your own item" })
    }

    let offeredItem = null
    if (offeredItemId) {
      offeredItem = await Item.findById(offeredItemId)
      if (!offeredItem) {
        return res.status(404).json({ message: "Offered item not found" })
      }
      if (offeredItem.owner.toString() !== req.user.id) {
        return res.status(400).json({ message: "Offered item must belong to you" })
      }
    }

    // Check for existing pending swap between these items/users
    const existingSwap = await Swap.findOne({
      requester: req.user.id,
      requestedItem: requestedItemId,
      offeredItem: offeredItemId,
      status: "pending",
    })

    if (existingSwap) {
      return res.status(400).json({ message: "A pending swap request already exists for these items." })
    }

    const newSwap = new Swap({
      requester: req.user.id,
      requestedItem: requestedItemId,
      offeredItem: offeredItemId,
      message,
      status: "pending",
    })

    const swap = await newSwap.save()

    // Add swap to participants' swap arrays
    await User.findByIdAndUpdate(req.user.id, { $push: { swaps: swap._id } })
    await User.findByIdAndUpdate(requestedItem.owner, { $push: { swaps: swap._id } })
    if (offeredItem) {
      await User.findByIdAndUpdate(offeredItem.owner, { $push: { swaps: swap._id } })
    }

    // Emit socket event for the owner of the requested item
    emitSocketEvent(req, "newSwapRequest", {
      swapId: swap._id,
      requesterId: req.user.id,
      requesterName: req.user.username,
      requestedItemId: requestedItem._id,
      itemName: requestedItem.name,
      ownerId: requestedItem.owner,
      message: `New swap request for your item ${requestedItem.name}`,
    })

    res.status(201).json(swap)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/swaps/:id
// @desc    Get single swap by ID
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id)
      .populate("requester", "username email")
      .populate("requestedItem", "name owner")
      .populate("offeredItem", "name owner")

    if (!swap) {
      return res.status(404).json({ message: "Swap not found" })
    }

    // Ensure only participants or admin can view the swap
    const isParticipant =
      swap.requester._id.toString() === req.user.id ||
      (swap.requestedItem && swap.requestedItem.owner.toString() === req.user.id) ||
      (swap.offeredItem && swap.offeredItem.owner.toString() === req.user.id)

    if (!isParticipant && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to view this swap" })
    }

    res.status(200).json(swap)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/swaps/request
// @desc    Initiate a new swap request
// @access  Private
router.post(
  "/request",
  protect,
  [
    body("receiverId", "Receiver ID is required").notEmpty(),
    body("initiatorItemId", "Initiator item ID is required").notEmpty(),
    body("receiverItemId", "Receiver item ID is required").notEmpty(),
    body("message", "Message is required").notEmpty().isLength({ max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { receiverId, initiatorItemId, receiverItemId, message } = req.body
    const initiatorId = req.user.id

    try {
      // Ensure initiator and receiver are different users
      if (initiatorId === receiverId) {
        return res.status(400).json({ message: "Cannot swap with yourself" })
      }

      // Check if items exist and belong to the correct users
      const initiatorItem = await Item.findById(initiatorItemId)
      const receiverItem = await Item.findById(receiverItemId)

      if (!initiatorItem || !receiverItem) {
        return res.status(404).json({ message: "One or both items not found" })
      }

      if (initiatorItem.owner.toString() !== initiatorId) {
        return res.status(401).json({ message: "Initiator does not own the provided initiator item" })
      }
      if (receiverItem.owner.toString() !== receiverId) {
        return res.status(401).json({ message: "Receiver does not own the provided receiver item" })
      }

      // Check if items are available for swap
      if (!initiatorItem.isAvailable || !receiverItem.isAvailable) {
        return res.status(400).json({ message: "One or both items are not available for swap" })
      }

      // Check for existing pending swap between these items/users
      const existingSwap = await Swap.findOne({
        $or: [
          {
            initiator: initiatorId,
            receiver: receiverId,
            initiatorItem: initiatorItemId,
            receiverItem: receiverItemId,
            status: "pending",
          },
          {
            initiator: receiverId,
            receiver: initiatorId,
            initiatorItem: receiverItemId,
            receiverItem: initiatorItemId,
            status: "pending",
          },
        ],
      })

      if (existingSwap) {
        return res.status(400).json({ message: "A pending swap request already exists for these items." })
      }

      const newSwap = new Swap({
        initiator: initiatorId,
        receiver: receiverId,
        initiatorItem: initiatorItemId,
        receiverItem: receiverItemId,
        message,
        status: "pending",
      })

      const swap = await newSwap.save()

      // Add swap to users' initiated/received lists
      await User.findByIdAndUpdate(initiatorId, { $push: { swapsInitiated: swap._id } })
      await User.findByIdAndUpdate(receiverId, { $push: { swapsReceived: swap._id } })

      res.status(201).json({ message: "Swap request sent successfully", swap })
    } catch (err) {
      console.error(err.message)
      res.status(500).send("Server error")
    }
  },
)

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
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { status } = req.body
    const swapId = req.params.id
    const userId = req.user.id

    try {
      const swap = await Swap.findById(swapId)

      if (!swap) {
        return res.status(404).json({ message: "Swap request not found" })
      }

      // Check if the user is either the initiator or the receiver
      const isInitiator = swap.initiator.toString() === userId
      const isReceiver = swap.receiver.toString() === userId

      if (!isInitiator && !isReceiver) {
        return res.status(401).json({ message: "Not authorized to update this swap" })
      }

      // Logic for status transitions
      if (status === "accepted") {
        if (!isReceiver || swap.status !== "pending") {
          return res.status(400).json({ message: "Only the receiver can accept a pending swap" })
        }
        swap.status = "accepted"
      } else if (status === "rejected") {
        if (!isReceiver || swap.status !== "pending") {
          return res.status(400).json({ message: "Only the receiver can reject a pending swap" })
        }
        swap.status = "rejected"
      } else if (status === "completed") {
        if (swap.status !== "accepted") {
          return res.status(400).json({ message: "Swap must be accepted before it can be completed" })
        }
        // Both parties can mark as completed, but usually, one confirms after physical exchange
        // For simplicity, let's allow either to mark as completed if accepted
        swap.status = "completed"

        // Mark items as unavailable
        await Item.findByIdAndUpdate(swap.initiatorItem, { isAvailable: false })
        await Item.findByIdAndUpdate(swap.receiverItem, { isAvailable: false })

        // Update user points (example: 50 points per completed swap)
        const initiatorUser = await User.findById(swap.initiator)
        const receiverUser = await User.findById(swap.receiver)
        if (initiatorUser) {
          initiatorUser.points += 50
          await initiatorUser.save()
        }
        if (receiverUser) {
          receiverUser.points += 50
          await receiverUser.save()
        }
      } else if (status === "cancelled") {
        if (swap.status === "completed") {
          return res.status(400).json({ message: "Cannot cancel a completed swap" })
        }
        // Either party can cancel if not completed
        swap.status = "cancelled"
        // If items were marked unavailable (e.g., after acceptance), make them available again
        await Item.findByIdAndUpdate(swap.initiatorItem, { isAvailable: true })
        await Item.findByIdAndUpdate(swap.receiverItem, { isAvailable: true })
      } else {
        return res.status(400).json({ message: "Invalid status update" })
      }

      await swap.save()
      res.json({ message: `Swap status updated to ${swap.status}`, swap })
    } catch (err) {
      console.error(err.message)
      res.status(500).send("Server error")
    }
  },
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
router.delete("/:id", protect, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id).populate("requestedItem").populate("offeredItem")

    if (!swap) {
      return res.status(404).json({ message: "Swap not found" })
    }

    // Only requester can cancel pending swaps
    if (swap.requester.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the requester can cancel this swap" })
    }

    if (swap.status !== "pending") {
      return res.status(400).json({ message: "Only pending swaps can be cancelled" })
    }

    await swap.updateStatus("cancelled")

    // Notify owner
    const io = req.app.get("io")
    if (io) {
      io.to(swap.owner.toString()).emit("swap-cancelled", {
        swapId: swap._id,
        message: "A swap request has been cancelled",
      })
    }

    res.json({
      message: "Swap cancelled successfully",
    })
  } catch (error) {
    console.error("Cancel swap error:", error)
    res.status(500).json({ message: "Server error while cancelling swap" })
  }
})

module.exports = router
