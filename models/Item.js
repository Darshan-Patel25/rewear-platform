const mongoose = require("mongoose")

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["tops", "bottoms", "dresses", "outerwear", "shoes", "accessories", "activewear", "formal"],
    },
    type: {
      type: String,
      required: [true, "Type is required"],
    },
    size: {
      type: String,
      required: [true, "Size is required"],
      enum: ["XS", "S", "M", "L", "XL", "XXL", "6", "7", "8", "9", "10", "11", "12", "One Size"],
    },
    condition: {
      type: String,
      required: [true, "Condition is required"],
      enum: ["new", "like-new", "good", "fair"],
    },
    brand: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      required: [true, "Color is required"],
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: String,
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    pointValue: {
      type: Number,
      required: true,
      min: [1, "Point value must be at least 1"],
      max: [500, "Point value cannot exceed 500"],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "swapped", "redeemed"],
      default: "pending",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    rejectionReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

// Index for search functionality
itemSchema.index({
  title: "text",
  description: "text",
  tags: "text",
  brand: "text",
})

// Index for filtering
itemSchema.index({ category: 1, size: 1, condition: 1, status: 1 })

module.exports = mongoose.model("Item", itemSchema)
