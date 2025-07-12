const mongoose = require("mongoose")

const swapSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "points"],
      required: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    offeredItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: false, // Optional, for direct swaps
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "completed", "cancelled"],
      default: "pending",
    },
    message: {
      type: String,
      maxlength: [500, "Message cannot exceed 500 characters"],
    },
    conversation: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        message: {
          type: String,
          required: true,
          maxlength: [1000, "Message cannot exceed 1000 characters"],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        read: {
          type: Boolean,
          default: false,
        },
      },
    ],
    shippingDetails: {
      method: {
        type: String,
        enum: ["pickup", "shipping", "meetup"],
      },
      initiatorAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      receiverAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      trackingNumbers: {
        initiatorToReceiver: String,
        receiverToInitiator: String,
      },
      shippingCost: {
        initiatorPays: Number,
        receiverPays: Number,
      },
    },
    timeline: [
      {
        status: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: String,
      },
    ],
    rating: {
      initiatorRating: {
        score: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: String,
        timestamp: Date,
      },
      receiverRating: {
        score: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: String,
        timestamp: Date,
      },
    },
    completedAt: Date,
    expiresAt: {
      type: Date,
      default: () => {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
    },
    adminNotes: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better query performance
swapSchema.index({ requester: 1, status: 1 })
swapSchema.index({ receiver: 1, status: 1 })
swapSchema.index({ requestedItem: 1 })
swapSchema.index({ offeredItem: 1 })
swapSchema.index({ status: 1, createdAt: -1 })
swapSchema.index({ expiresAt: 1 })

// Virtual for swap participants
swapSchema.virtual("participants").get(function () {
  return [this.requester, this.receiver]
})

// Method to add message to conversation
swapSchema.methods.addMessage = function (senderId, message) {
  this.conversation.push({
    sender: senderId,
    message: message,
    timestamp: new Date(),
  })
  return this.save()
}

// Method to mark messages as read
swapSchema.methods.markMessagesAsRead = function (userId) {
  this.conversation.forEach((msg) => {
    if (msg.sender.toString() !== userId.toString()) {
      msg.read = true
    }
  })
  return this.save()
}

// Method to get unread message count for a user
swapSchema.methods.getUnreadCount = function (userId) {
  return this.conversation.filter((msg) => msg.sender.toString() !== userId.toString() && !msg.read).length
}

// Method to check if user is participant
swapSchema.methods.isParticipant = function (userId) {
  return this.requester.toString() === userId.toString() || this.receiver.toString() === userId.toString()
}

// Method to get other participant
swapSchema.methods.getOtherParticipant = function (userId) {
  if (this.requester.toString() === userId.toString()) {
    return this.receiver
  } else if (this.receiver.toString() === userId.toString()) {
    return this.requester
  }
  return null
}

// Method to update status with timeline
swapSchema.methods.updateStatus = function (newStatus, note = "") {
  this.status = newStatus
  this.timeline.push({
    status: newStatus,
    timestamp: new Date(),
    note: note,
  })

  if (newStatus === "completed") {
    this.completedAt = new Date()
  }

  return this.save()
}

// Method to calculate swap value
swapSchema.methods.getSwapValue = function () {
  if (this.type === "points") {
    return this.pointsOffered
  }
  // For direct swaps, we'd need to populate the items to get their point values
  return 0
}

// Static method to get user's swaps
swapSchema.statics.getUserSwaps = function (userId, status = null) {
  const query = {
    $or: [{ requester: userId }, { receiver: userId }],
  }

  if (status) {
    query.status = status
  }

  return this.find(query)
    .populate("requester", "username firstName lastName avatar")
    .populate("receiver", "username firstName lastName avatar")
    .populate("requestedItem", "title images pointValue")
    .populate("offeredItem", "title images pointValue")
    .sort({ createdAt: -1 })
}

// Static method to get pending swaps for an item
swapSchema.statics.getPendingSwapsForItem = function (itemId) {
  return this.find({
    requestedItem: itemId,
    status: "pending",
  })
    .populate("requester", "username firstName lastName avatar")
    .populate("offeredItem", "title images pointValue")
    .sort({ createdAt: -1 })
}

// Pre-save middleware to validate swap logic
swapSchema.pre("save", function (next) {
  // Validate that direct swaps have offered items
  if (this.type === "direct" && !this.offeredItem) {
    return next(new Error("Direct swaps must include an offered item"))
  }

  // Validate that point swaps have points offered
  if (this.type === "points" && !this.pointsOffered) {
    return next(new Error("Point swaps must include points offered"))
  }

  // Prevent self-swapping
  if (this.requester.toString() === this.receiver.toString()) {
    return next(new Error("Cannot create swap with yourself"))
  }

  // Update `updatedAt` field on save
  this.updatedAt = Date.now()
  next()
})

// TTL index to automatically remove expired pending swaps
swapSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { status: "pending" },
  },
)

module.exports = mongoose.model("Swap", swapSchema)
