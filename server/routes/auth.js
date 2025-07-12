const express = require("express")
const { body, validationResult } = require("express-validator")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const { protect } = require("../middleware/auth")

const router = express.Router()

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post(
  "/register",
  [
    body("username", "Username is required").notEmpty(),
    body("email", "Please include a valid email").isEmail(),
    body("password", "Password must be at least 6 characters").isLength({ min: 6 }),
    body("firstName", "First name is required").notEmpty(),
    body("lastName", "Last name is required").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { username, email, password, firstName, lastName } = req.body

    try {
      let user = await User.findOne({ $or: [{ email }, { username }] })

      if (user) {
        return res.status(400).json({ message: "User with that email or username already exists" })
      }

      user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
      })

      await user.save()

      const payload = {
        user: {
          id: user.id,
        },
      }

      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }, (err, token) => {
        if (err) throw err
        res.status(201).json({
          message: "User registered successfully",
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePicture: user.profilePicture,
            bio: user.bio,
            location: user.location,
            points: user.points,
            isAdmin: user.isAdmin,
          },
        })
      })
    } catch (err) {
      console.error(err.message)
      res.status(500).send("Server error")
    }
  },
)

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  "/login",
  [body("email", "Please include a valid email").isEmail(), body("password", "Password is required").exists()],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    try {
      const user = await User.findOne({ email })

      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" })
      }

      const isMatch = await user.matchPassword(password)

      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" })
      }

      const payload = {
        user: {
          id: user.id,
        },
      }

      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }, (err, token) => {
        if (err) throw err
        res.json({
          message: "Logged in successfully",
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePicture: user.profilePicture,
            bio: user.bio,
            location: user.location,
            points: user.points,
            isAdmin: user.isAdmin,
          },
        })
      })
    } catch (err) {
      console.error(err.message)
      res.status(500).send("Server error")
    }
  },
)

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.json(user)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
})

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  protect,
  [
    body("username", "Username is required").optional().notEmpty(),
    body("email", "Please include a valid email").optional().isEmail(),
    body("firstName", "First name is required").optional().notEmpty(),
    body("lastName", "Last name is required").optional().notEmpty(),
    body("bio", "Bio cannot exceed 500 characters").optional().isLength({ max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { username, email, firstName, lastName, profilePicture, bio, location } = req.body

    try {
      const user = await User.findById(req.user.id)

      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      // Check if new email or username already exists for another user
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email })
        if (existingUser && existingUser.id !== user.id) {
          return res.status(400).json({ message: "Email already in use" })
        }
      }
      if (username && username !== user.username) {
        const existingUser = await User.findOne({ username })
        if (existingUser && existingUser.id !== user.id) {
          return res.status(400).json({ message: "Username already in use" })
        }
      }

      user.username = username || user.username
      user.email = email || user.email
      user.firstName = firstName || user.firstName
      user.lastName = lastName || user.lastName
      user.profilePicture = profilePicture || user.profilePicture
      user.bio = bio || user.bio
      user.location = location || user.location

      await user.save()

      res.json({
        message: "Profile updated successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
          bio: user.bio,
          location: user.location,
          points: user.points,
          isAdmin: user.isAdmin,
        },
      })
    } catch (err) {
      console.error(err.message)
      res.status(500).send("Server error")
    }
  },
)

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put(
  "/change-password",
  protect,
  [
    body("currentPassword", "Current password is required").exists(),
    body("newPassword", "New password must be at least 6 characters").isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { currentPassword, newPassword } = req.body

    try {
      const user = await User.findById(req.user.id)

      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      const isMatch = await user.matchPassword(currentPassword)

      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" })
      }

      user.password = newPassword // Pre-save hook will hash it
      await user.save()

      res.json({ message: "Password updated successfully" })
    } catch (err) {
      console.error(err.message)
      res.status(500).send("Server error")
    }
  },
)

module.exports = router
