const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    points: {
      type: Number,
      default: 100, // Starting points for new users
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    bio: {
      type: String,
      maxlength: 500,
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
  },
  {
    timestamps: true,
  },
)

// Index for search optimization
userSchema.index({ username: 1, email: 1 })
userSchema.index({ "location.city": 1, "location.state": 1 })

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

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject()
  delete user.password
  return user
}

module.exports = mongoose.model("User", userSchema)
