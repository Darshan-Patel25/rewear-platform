const mongoose = require("mongoose")

const swapSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct-swap", "point-redemption"],
      required: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    owner: {
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
      required: false, // Not required for point redemption
    },
    pointsOffered: {
      type: Number,
      required: function () {
        return this.type === "point-redemption"
      },
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
      default: "pending",
    },
    message: {
      type: String,
      maxlength: 500,
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
          maxlength: 500,
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
    meetingDetails: {
      method: {
        type: String,
        enum: ["in-person", "shipping", "pickup"],
        default: "in-person",
      },
      location: String,
      scheduledDate: Date,
      notes: String,
    },
    tracking: {
      requesterShipped: { type: Boolean, default: false },
      ownerShipped: { type: Boolean, default: false },
      requesterReceived: { type: Boolean, default: false },
      ownerReceived: { type: Boolean, default: false },
      trackingNumbers: {
        requesterToOwner: String,
        ownerToRequester: String,
      },
    },
    rating: {
      requesterRating: {
        score: { type: Number, min: 1, max: 5 },
        comment: String,
        date: Date,
      },
      ownerRating: {
        score: { type: Number, min: 1, max: 5 },
        comment: String,
        date: Date,
      },
    },
    completedAt: Date,
    cancelledAt: Date,
    cancelReason: String,
  },
  {
    timestamps: true,
  },
)

// Indexes for efficient queries
swapSchema.index({ requester: 1, status: 1 })
swapSchema.index({ owner: 1, status: 1 })
swapSchema.index({ requestedItem: 1 })
swapSchema.index({ offeredItem: 1 })
swapSchema.index({ status: 1, createdAt: -1 })

// Middleware to update item availability when swap is accepted
swapSchema.post("save", async (doc) => {
  if (doc.status === "accepted") {
    const Item = mongoose.model("Item")

    // Update requested item
    await Item.findByIdAndUpdate(doc.requestedItem, {
      availability: "pending-swap",
    })

    // Update offered item if it exists (direct swap)
    if (doc.offeredItem) {
      await Item.findByIdAndUpdate(doc.offeredItem, {
        availability: "pending-swap",
      })
    }
  }

  if (doc.status === "completed") {
    const Item = mongoose.model("Item")
    const User = mongoose.model("User")

    // Update items to swapped status
    await Item.findByIdAndUpdate(doc.requestedItem, {
      availability: "swapped",
    })

    if (doc.offeredItem) {
      await Item.findByIdAndUpdate(doc.offeredItem, {
        availability: "swapped",
      })
    }

    // Update user stats
    await User.findByIdAndUpdate(doc.requester, {
      $inc: { "stats.itemsSwapped": 1 },
    })

    await User.findByIdAndUpdate(doc.owner, {
      $inc: { "stats.itemsSwapped": 1 },
    })

    // Handle points for point redemption
    if (doc.type === "point-redemption") {
      await User.findByIdAndUpdate(doc.requester, {
        $inc: {
          points: -doc.pointsOffered,
          "stats.pointsSpent": doc.pointsOffered,
        },
      })

      await User.findByIdAndUpdate(doc.owner, {
        $inc: {
          points: doc.pointsOffered,
          "stats.pointsEarned": doc.pointsOffered,
        },
      })
    }
  }
})

module.exports = mongoose.model("Swap", swapSchema)
