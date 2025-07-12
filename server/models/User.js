const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    points: {
      type: Number,
      default: 100, // Starting points for new users
      min: [0, "Points cannot be negative"],
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    avatar: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    location: {
      city: String,
      state: String,
      country: String,
    },
    preferences: {
      categories: [String],
      sizes: [String],
      brands: [String],
    },
    stats: {
      itemsListed: { type: Number, default: 0 },
      itemsSwapped: { type: Number, default: 0 },
      pointsEarned: { type: Number, default: 0 },
      pointsSpent: { type: Number, default: 0 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  },
)

// Index for better query performance
userSchema.index({ email: 1 })
userSchema.index({ username: 1 })
userSchema.index({ createdAt: -1 })

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Get full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`
})

// Get public profile (exclude sensitive data)
userSchema.methods.getPublicProfile = function () {
  const user = this.toObject()
  delete user.password
  delete user.emailVerificationToken
  delete user.passwordResetToken
  delete user.passwordResetExpires
  return user
}

// Update user stats
userSchema.methods.updateStats = function (type, value = 1) {
  switch (type) {
    case "itemListed":
      this.stats.itemsListed += value
      break
    case "itemSwapped":
      this.stats.itemsSwapped += value
      break
    case "pointsEarned":
      this.stats.pointsEarned += value
      this.points += value
      break
    case "pointsSpent":
      this.stats.pointsSpent += value
      this.points -= value
      break
  }
  return this.save()
}

module.exports = mongoose.model("User", userSchema)
