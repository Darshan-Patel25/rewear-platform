const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { body, validationResult } = require("express-validator")
const User = require("../models/User")
const { auth, sensitiveOpLimit } = require("../middleware/auth")

const router = express.Router()

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" })
}

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  "/register",
  [
    body("username")
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be between 3 and 30 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username can only contain letters, numbers, and underscores"),
    body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    body("firstName")
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("First name is required and cannot exceed 50 characters"),
    body("lastName")
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Last name is required and cannot exceed 50 characters"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { username, email, password, firstName, lastName } = req.body

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      })

      if (existingUser) {
        if (existingUser.email === email) {
          return res.status(400).json({ message: "User with this email already exists" })
        }
        if (existingUser.username === username) {
          return res.status(400).json({ message: "Username is already taken" })
        }
      }

      // Create new user
      const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
      })

      await user.save()

      // Generate token
      const token = generateToken(user._id)

      // Update last login
      user.lastLogin = new Date()
      await user.save()

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: user.getPublicProfile(),
      })
    } catch (error) {
      console.error("Registration error:", error)

      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0]
        return res.status(400).json({
          message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        })
      }

      res.status(500).json({ message: "Server error during registration" })
    }
  },
)

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
    body("password").exists().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { email, password } = req.body

      // Find user by email
      const user = await User.findOne({ email })
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" })
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(400).json({ message: "Account is deactivated" })
      }

      // Verify password
      const isMatch = await user.comparePassword(password)
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" })
      }

      // Generate token
      const token = generateToken(user._id)

      // Update last login
      user.lastLogin = new Date()
      await user.save()

      res.json({
        message: "Login successful",
        token,
        user: user.getPublicProfile(),
      })
    } catch (error) {
      console.error("Login error:", error)
      res.status(500).json({ message: "Server error during login" })
    }
  },
)

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", auth, async (req, res) => {
  try {
    res.json({
      user: req.user.getPublicProfile(),
    })
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  auth,
  [
    body("firstName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("First name cannot exceed 50 characters"),
    body("lastName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Last name cannot exceed 50 characters"),
    body("bio").optional().trim().isLength({ max: 500 }).withMessage("Bio cannot exceed 500 characters"),
    body("location.city")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("City name cannot exceed 100 characters"),
    body("location.state")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("State name cannot exceed 100 characters"),
    body("location.country")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Country name cannot exceed 100 characters"),
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

      const allowedUpdates = ["firstName", "lastName", "bio", "location", "preferences"]
      const updates = {}

      // Only include allowed fields
      Object.keys(req.body).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key]
        }
      })

      const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true })

      res.json({
        message: "Profile updated successfully",
        user: user.getPublicProfile(),
      })
    } catch (error) {
      console.error("Profile update error:", error)
      res.status(500).json({ message: "Server error during profile update" })
    }
  },
)

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put(
  "/change-password",
  auth,
  sensitiveOpLimit,
  [
    body("currentPassword").exists().withMessage("Current password is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters long"),
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

      const { currentPassword, newPassword } = req.body

      // Get user with password
      const user = await User.findById(req.user._id)

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword)
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" })
      }

      // Update password
      user.password = newPassword
      await user.save()

      res.json({ message: "Password changed successfully" })
    } catch (error) {
      console.error("Password change error:", error)
      res.status(500).json({ message: "Server error during password change" })
    }
  },
)

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post(
  "/forgot-password",
  sensitiveOpLimit,
  [body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { email } = req.body

      const user = await User.findOne({ email })
      if (!user) {
        // Don't reveal if email exists or not
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." })
      }

      // Generate reset token (in production, implement proper token generation and email sending)
      const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" })

      user.passwordResetToken = resetToken
      user.passwordResetExpires = new Date(Date.now() + 3600000) // 1 hour
      await user.save()

      // TODO: Send email with reset link
      console.log(`Password reset token for ${email}: ${resetToken}`)

      res.json({ message: "If an account with that email exists, a password reset link has been sent." })
    } catch (error) {
      console.error("Forgot password error:", error)
      res.status(500).json({ message: "Server error during password reset request" })
    }
  },
)

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post(
  "/reset-password",
  sensitiveOpLimit,
  [
    body("token").exists().withMessage("Reset token is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters long"),
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

      const { token, newPassword } = req.body

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      const user = await User.findOne({
        _id: decoded.userId,
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      })

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" })
      }

      // Update password
      user.password = newPassword
      user.passwordResetToken = undefined
      user.passwordResetExpires = undefined
      await user.save()

      res.json({ message: "Password reset successfully" })
    } catch (error) {
      console.error("Reset password error:", error)
      if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
        return res.status(400).json({ message: "Invalid or expired reset token" })
      }
      res.status(500).json({ message: "Server error during password reset" })
    }
  },
)

// @route   DELETE /api/auth/account
// @desc    Deactivate user account
// @access  Private
router.delete(
  "/account",
  auth,
  sensitiveOpLimit,
  [body("password").exists().withMessage("Password confirmation is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        })
      }

      const { password } = req.body

      // Get user with password
      const user = await User.findById(req.user._id)

      // Verify password
      const isMatch = await user.comparePassword(password)
      if (!isMatch) {
        return res.status(400).json({ message: "Password is incorrect" })
      }

      // Deactivate account instead of deleting
      user.isActive = false
      await user.save()

      res.json({ message: "Account deactivated successfully" })
    } catch (error) {
      console.error("Account deactivation error:", error)
      res.status(500).json({ message: "Server error during account deactivation" })
    }
  },
)

module.exports = router
