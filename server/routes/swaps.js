const express = require("express")
const { body, validationResult, query } = require("express-validator")
const Swap = require("../models/Swap")
const Item = require("../models/Item")
const User = require("../models/User")
const { auth, protect } = require("../middleware/auth")

const router = express.Router()

// @route   GET /api/swaps
// @desc    Get user's swaps
// @access  Private
router.get(
  "/",
  auth,
  [
    query("status").optional().isIn(["pending", "accepted", "rejected", "completed", "cancelled"]),
    query("type").optional().isIn(["direct", "points"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
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

      const { status, type, page = 1, limit = 10 } = req.query

      // Build filter
      const filter = {
        $or: [{ requester: req.user._id }, { owner: req.user._id }],
      }

      if (status) filter.status = status
      if (type) filter.type = type

      const swaps = await Swap.find(filter)
        .populate("requester", "username firstName lastName avatar")
        .populate("owner", "username firstName lastName avatar")
        .populate("requestedItem", "title images pointValue status")
        .populate("offeredItem", "title images pointValue status")
        .sort({ createdAt: -1 })
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
      console.error("Get swaps error:", error)
      res.status(500).json({ message: "Server error while fetching swaps" })
    }
  },
)

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
// @desc    Create new swap request
// @access  Private
router.post(
  "/",
  auth,
  [
    body("type").isIn(["direct", "points"]).withMessage("Invalid swap type"),
    body("requestedItem").isMongoId().withMessage("Invalid requested item ID"),
    body("offeredItem").optional().isMongoId().withMessage("Invalid offered item ID"),
    body("pointsOffered").optional().isInt({ min: 1 }).withMessage("Points offered must be positive"),
    body("message").optional().trim().isLength({ max: 500 }).withMessage("Message cannot exceed 500 characters"),
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

      const { type, requestedItem, offeredItem, pointsOffered, message } = req.body

      // Get requested item
      const requestedItemDoc = await Item.findById(requestedItem).populate("owner")
      if (!requestedItemDoc) {
        return res.status(404).json({ message: "Requested item not found" })
      }

      if (requestedItemDoc.status !== "available") {
        return res.status(400).json({ message: "Requested item is not available" })
      }

      if (requestedItemDoc.owner._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: "Cannot create swap with your own item" })
      }

      // Validate swap type requirements
      if (type === "direct") {
        if (!offeredItem) {
          return res.status(400).json({ message: "Offered item is required for direct swaps" })
        }

        const offeredItemDoc = await Item.findById(offeredItem)
        if (!offeredItemDoc) {
          return res.status(404).json({ message: "Offered item not found" })
        }

        if (offeredItemDoc.owner.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: "You can only offer your own items" })
        }

        if (offeredItemDoc.status !== "available") {
          return res.status(400).json({ message: "Offered item is not available" })
        }
      }

      if (type === "points") {
        if (!pointsOffered) {
          return res.status(400).json({ message: "Points offered is required for point swaps" })
        }

        if (req.user.points < pointsOffered) {
          return res.status(400).json({ message: "Insufficient points" })
        }

        if (pointsOffered < requestedItemDoc.pointValue) {
          return res.status(400).json({
            message: `Minimum ${requestedItemDoc.pointValue} points required for this item`,
          })
        }
      }

      // Check for existing pending swap
      const existingSwap = await Swap.findOne({
        requester: req.user._id,
        requestedItem: requestedItem,
        status: "pending",
      })

      if (existingSwap) {
        return res.status(400).json({ message: "You already have a pending swap for this item" })
      }

      // Create swap
      const swapData = {
        type,
        requester: req.user._id,
        owner: requestedItemDoc.owner._id,
        requestedItem,
        message,
      }

      if (type === "direct") {
        swapData.offeredItem = offeredItem
      } else {
        swapData.pointsOffered = pointsOffered
      }

      const swap = new Swap(swapData)
      await swap.save()

      // Populate the swap for response
      const populatedSwap = await Swap.findById(swap._id)
        .populate("requester", "username firstName lastName avatar")
        .populate("owner", "username firstName lastName avatar")
        .populate("requestedItem", "title images pointValue")
        .populate("offeredItem", "title images pointValue")

      // Notify owner via socket
      const io = req.app.get("io")
      if (io) {
        io.to(requestedItemDoc.owner._id.toString()).emit("swap-request", {
          swap: populatedSwap,
          message: "You have a new swap request!",
        })
      }

      res.status(201).json({
        message: "Swap request created successfully",
        swap: populatedSwap,
      })
    } catch (error) {
      console.error("Create swap error:", error)
      res.status(500).json({ message: "Server error while creating swap" })
    }
  },
)

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

// @route   GET /api/swaps/:id
// @desc    Get a single swap request by ID
// @access  Private (initiator or receiver)
router.get("/:id", protect, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id)
      .populate("initiator", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .populate("initiatorItem", "name images")
      .populate("receiverItem", "name images")

    if (!swap) {
      return res.status(404).json({ message: "Swap request not found" })
    }

    // Ensure only involved parties can view the swap details
    if (swap.initiator.toString() !== req.user.id && swap.receiver.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to view this swap" })
    }

    res.json(swap)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// @route   PUT /api/swaps/:id/respond
// @desc    Respond to swap request (accept/reject)
// @access  Private
router.put(
  "/:id/respond",
  auth,
  [
    body("action").isIn(["accept", "reject"]).withMessage("Invalid action"),
    body("message").optional().trim().isLength({ max: 500 }).withMessage("Message cannot exceed 500 characters"),
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

      const { action, message } = req.body

      const swap = await Swap.findById(req.params.id)
        .populate("requester", "username firstName lastName")
        .populate("owner", "username firstName lastName")
        .populate("requestedItem")
        .populate("offeredItem")

      if (!swap) {
        return res.status(404).json({ message: "Swap not found" })
      }

      // Check if user is the owner
      if (swap.owner._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Only the item owner can respond to this swap" })
      }

      if (swap.status !== "pending") {
        return res.status(400).json({ message: "Swap has already been responded to" })
      }

      if (action === "accept") {
        // Validate items are still available
        if (swap.requestedItem.status !== "available") {
          return res.status(400).json({ message: "Requested item is no longer available" })
        }

        if (swap.type === "direct" && swap.offeredItem.status !== "available") {
          return res.status(400).json({ message: "Offered item is no longer available" })
        }

        if (swap.type === "points") {
          // Check if requester still has enough points
          const requester = await User.findById(swap.requester._id)
          if (requester.points < swap.pointsOffered) {
            return res.status(400).json({ message: "Requester no longer has sufficient points" })
          }
        }

        // Accept the swap
        await swap.updateStatus("accepted", message)

        // Reserve the items
        swap.requestedItem.status = "reserved"
        await swap.requestedItem.save()

        if (swap.type === "direct") {
          swap.offeredItem.status = "reserved"
          await swap.offeredItem.save()
        }

        // Handle points transaction for point swaps
        if (swap.type === "points") {
          const requester = await User.findById(swap.requester._id)
          const owner = await User.findById(swap.owner._id)

          requester.points -= swap.pointsOffered
          owner.points += swap.pointsOffered

          await requester.save()
          await owner.save()
        }
      } else {
        // Reject the swap
        await swap.updateStatus("rejected", message)
      }

      // Add message to conversation if provided
      if (message) {
        await swap.addMessage(req.user._id, message)
      }

      // Notify requester via socket
      const io = req.app.get("io")
      if (io) {
        io.to(swap.requester._id.toString()).emit("swap-response", {
          swapId: swap._id,
          action,
          message: `Your swap request has been ${action}ed`,
        })
      }

      const updatedSwap = await Swap.findById(swap._id)
        .populate("requester", "username firstName lastName avatar")
        .populate("owner", "username firstName lastName avatar")
        .populate("requestedItem", "title images pointValue")
        .populate("offeredItem", "title images pointValue")

      res.json({
        message: `Swap ${action}ed successfully`,
        swap: updatedSwap,
      })
    } catch (error) {
      console.error("Respond to swap error:", error)
      res.status(500).json({ message: "Server error while responding to swap" })
    }
  },
)

// @route   PUT /api/swaps/:id/complete
// @desc    Mark swap as completed
// @access  Private
router.put("/:id/complete", auth, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id).populate("requestedItem").populate("offeredItem")

    if (!swap) {
      return res.status(404).json({ message: "Swap not found" })
    }

    if (!swap.isParticipant(req.user._id)) {
      return res.status(403).json({ message: "Access denied" })
    }

    if (swap.status !== "accepted") {
      return res.status(400).json({ message: "Swap must be accepted before completion" })
    }

    // Mark swap as completed
    await swap.updateStatus("completed")

    // Update item statuses
    swap.requestedItem.status = "swapped"
    await swap.requestedItem.save()

    if (swap.type === "direct") {
      swap.offeredItem.status = "swapped"
      await swap.offeredItem.save()
    }

    // Update user stats
    const requester = await User.findById(swap.requester)
    const owner = await User.findById(swap.owner)

    await requester.updateStats("itemSwapped")
    await owner.updateStats("itemSwapped")

    if (swap.type === "points") {
      await owner.updateStats("pointsEarned", swap.pointsOffered)
    }

    // Notify other participant
    const otherParticipant = swap.getOtherParticipant(req.user._id)
    const io = req.app.get("io")
    if (io && otherParticipant) {
      io.to(otherParticipant.toString()).emit("swap-completed", {
        swapId: swap._id,
        message: "Swap has been marked as completed",
      })
    }

    res.json({
      message: "Swap completed successfully",
      swap,
    })
  } catch (error) {
    console.error("Complete swap error:", error)
    res.status(500).json({ message: "Server error while completing swap" })
  }
})

// @route   POST /api/swaps/:id/message
// @desc    Add message to swap conversation
// @access  Private
router.post(
  "/:id/message",
  auth,
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
router.put("/:id/read", auth, async (req, res) => {
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
router.delete("/:id", auth, async (req, res) => {
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
