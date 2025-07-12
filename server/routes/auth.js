const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const { protect } = require("../middleware/auth")
const { register, login, getMe } = require("../controllers/auth")

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post("/register", register)

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", login)

// @route   GET /api/auth/me
// @desc    Get logged in user profile
// @access  Private
router.get("/me", protect, getMe)

module.exports = router
