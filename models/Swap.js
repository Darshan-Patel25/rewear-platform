const mongoose = require("mongoose")

const swapSchema = new mongoose.Schema(
  {
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
    },
    type: {
      type: String,
      enum: ["swap", "points"],
      required: true,
    },
    pointsOffered: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
      default: "pending",
    },
    message: {
      type: String,
      maxlength: [500, "Message cannot exceed 500 characters"],
    },
    rejectionReason: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Prevent duplicate swap requests
swapSchema.index(
  {
    requester: 1,
    requestedItem: 1,
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "accepted"] } },
  },
)

module.exports = mongoose.model("Swap", swapSchema)
