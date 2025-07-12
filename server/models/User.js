const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
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
  profilePicture: {
    type: String,
    default: "https://res.cloudinary.com/your_cloud_name/image/upload/v1/placeholder-user.jpg", // Placeholder image
  },
  bio: {
    type: String,
    maxlength: 500,
  },
  location: {
    type: String,
  },
  itemsListed: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    },
  ],
  swapsInitiated: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Swap",
    },
  ],
  swapsReceived: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Swap",
    },
  ],
  points: {
    type: Number,
    default: 0,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next()
  }
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Method to calculate and update points (example logic)
userSchema.methods.calculatePoints = async function () {
  // Example: 10 points for each item listed, 50 points for each successful swap
  const itemsCount = this.itemsListed.length
  const successfulSwapsCount = await mongoose.model("Swap").countDocuments({
    $or: [
      { initiator: this._id, status: "completed" },
      { receiver: this._id, status: "completed" },
    ],
  })
  this.points = itemsCount * 10 + successfulSwapsCount * 50
  await this.save()
}

module.exports = mongoose.model("User", userSchema)
