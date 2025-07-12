const mongoose = require("mongoose")

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "tops",
        "bottoms",
        "dresses",
        "outerwear",
        "shoes",
        "accessories",
        "activewear",
        "formal",
        "casual",
        "vintage",
      ],
    },
    type: {
      type: String,
      required: true,
      enum: [
        "shirt",
        "blouse",
        "sweater",
        "jacket",
        "coat",
        "jeans",
        "pants",
        "shorts",
        "skirt",
        "dress",
        "sneakers",
        "boots",
        "heels",
        "sandals",
        "bag",
        "jewelry",
        "hat",
        "scarf",
        "belt",
        "other",
      ],
    },
    size: {
      type: String,
      required: true,
      enum: ["XS", "S", "M", "L", "XL", "XXL", "6", "7", "8", "9", "10", "11", "12", "One Size"],
    },
    condition: {
      type: String,
      required: true,
      enum: ["new", "like-new", "good", "fair", "worn"],
    },
    brand: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      required: true,
    },
    material: {
      type: String,
      trim: true,
    },
    images: [
      {
        url: String,
        publicId: String, // For Cloudinary
        alt: String,
      },
    ],
    tags: [String],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pointValue: {
      type: Number,
      required: true,
      min: 1,
      max: 500,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "swapped", "removed"],
      default: "pending",
    },
    availability: {
      type: String,
      enum: ["available", "pending-swap", "swapped", "removed"],
      default: "available",
    },
    swapPreferences: {
      acceptPoints: { type: Boolean, default: true },
      acceptSwaps: { type: Boolean, default: true },
      preferredCategories: [String],
      preferredSizes: [String],
    },
    location: {
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reports: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Indexes for search and filtering
itemSchema.index({ category: 1, size: 1, condition: 1 })
itemSchema.index({ owner: 1, status: 1 })
itemSchema.index({ status: 1, availability: 1 })
itemSchema.index({ title: "text", description: "text", tags: "text" })
itemSchema.index({ "location.city": 1, "location.state": 1 })
itemSchema.index({ createdAt: -1 })
itemSchema.index({ pointValue: 1 })

// Calculate point value based on condition and category
itemSchema.pre("save", function (next) {
  if (!this.pointValue) {
    const basePoints = 50

    // Adjust based on condition
    const conditionMultiplier = {
      new: 1.5,
      "like-new": 1.3,
      good: 1.0,
      fair: 0.7,
      worn: 0.5,
    }

    // Adjust based on category
    const categoryMultiplier = {
      formal: 1.4,
      outerwear: 1.3,
      shoes: 1.2,
      dresses: 1.2,
      accessories: 0.8,
      casual: 1.0,
      activewear: 1.1,
      vintage: 1.5,
      tops: 1.0,
      bottoms: 1.0,
    }

    this.pointValue = Math.round(
      basePoints * (conditionMultiplier[this.condition] || 1) * (categoryMultiplier[this.category] || 1),
    )
  }
  next()
})

module.exports = mongoose.model("Item", itemSchema)
