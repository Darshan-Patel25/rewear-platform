const mongoose = require("mongoose")

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Item title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
      maxlength: [500, "Description can not be more than 500 characters"],
    },
    category: {
      type: String,
      required: [true, "Please specify a category"],
      enum: ["Tops", "Bottoms", "Dresses", "Outerwear", "Footwear", "Accessories", "Other"],
    },
    subcategory: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [50, "Brand name cannot exceed 50 characters"],
    },
    size: {
      type: String,
      required: [true, "Please specify a size"],
      enum: ["XS", "S", "M", "L", "XL", "XXL", "One Size"],
    },
    condition: {
      type: String,
      required: [true, "Please specify the condition"],
      enum: ["New with tags", "Like new", "Gently used", "Used", "Fair"],
      lowercase: true,
    },
    color: {
      type: String,
      trim: true,
    },
    material: {
      type: String,
      trim: true,
    },
    images: {
      type: [String], // Array of image URLs
      default: [],
    },
    pointValue: {
      type: Number,
      required: [true, "Point value is required"],
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
      enum: ["pending", "approved", "rejected", "available", "reserved", "swapped"],
      default: "pending",
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    measurements: {
      chest: Number,
      waist: Number,
      hips: Number,
      length: Number,
      sleeve: Number,
      inseam: Number,
    },
    originalPrice: {
      type: Number,
      min: [0, "Original price cannot be negative"],
    },
    purchaseDate: Date,
    location: {
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    shippingOptions: {
      localPickup: { type: Boolean, default: false },
      shipping: { type: Boolean, default: true },
      meetup: { type: Boolean, default: false },
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
    reports: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: String,
        description: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    featured: {
      type: Boolean,
      default: false,
    },
    featuredUntil: Date,
    adminNotes: String,
    rejectionReason: String,
    isAvailable: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better query performance
itemSchema.index({ owner: 1, status: 1 })
itemSchema.index({ category: 1, status: 1 })
itemSchema.index({ status: 1, createdAt: -1 })
itemSchema.index({ pointValue: 1 })
itemSchema.index({ featured: 1, featuredUntil: 1 })
itemSchema.index({ "location.city": 1, "location.state": 1 })

// Text index for search functionality
itemSchema.index({
  title: "text",
  description: "text",
  brand: "text",
  tags: "text",
})

// Virtual for like count
itemSchema.virtual("likeCount").get(function () {
  return this.likes.length
})

// Method to increment views
itemSchema.methods.incrementViews = function () {
  this.views += 1
  return this.save()
}

// Method to toggle like
itemSchema.methods.toggleLike = function (userId) {
  const likeIndex = this.likes.indexOf(userId)
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1)
  } else {
    this.likes.push(userId)
  }
  return this.save()
}

// Method to check if user can edit item
itemSchema.methods.canEdit = function (userId) {
  return this.owner.toString() === userId.toString() && ["pending", "rejected", "available"].includes(this.status)
}

// Method to calculate condition-based point multiplier
itemSchema.methods.getConditionMultiplier = function () {
  const multipliers = {
    "new with tags": 1.0,
    "like new": 0.9,
    "gently used": 0.8,
    used: 0.7,
    fair: 0.6,
  }
  return multipliers[this.condition] || 0.8
}

// Pre-save middleware to validate point value based on condition
itemSchema.pre("save", function (next) {
  if (this.isModified("pointValue") || this.isModified("condition")) {
    const maxPoints = {
      "new with tags": 500,
      "like new": 400,
      "gently used": 300,
      used: 200,
      fair: 100,
    }

    if (this.pointValue > maxPoints[this.condition]) {
      this.pointValue = maxPoints[this.condition]
    }
  }
  next()
})

// Static method to get featured items
itemSchema.statics.getFeatured = function (limit = 8) {
  return this.find({
    status: "available",
    $or: [
      { featured: true, featuredUntil: { $gt: new Date() } },
      { featured: true, featuredUntil: null },
    ],
  })
    .populate("owner", "username firstName lastName avatar")
    .sort({ createdAt: -1 })
    .limit(limit)
}

// Static method for search
itemSchema.statics.search = function (query, filters = {}) {
  const searchQuery = {
    status: "available",
    ...filters,
  }

  if (query) {
    searchQuery.$text = { $search: query }
  }

  return this.find(searchQuery)
    .populate("owner", "username firstName lastName avatar")
    .sort(query ? { score: { $meta: "textScore" } } : { createdAt: -1 })
}

module.exports = mongoose.model("Item", itemSchema)
