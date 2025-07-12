const jwt = require("jsonwebtoken")
const User = require("../models/User")

// Verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "No token provided, access denied" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select("-password")

    if (!user) {
      return res.status(401).json({ message: "Token is not valid" })
    }

    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated" })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" })
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" })
    }
    console.error("Auth middleware error:", error)
    res.status(500).json({ message: "Server error in authentication" })
  }
}

// Check if user is admin
const adminAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" })
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    next()
  } catch (error) {
    console.error("Admin auth middleware error:", error)
    res.status(500).json({ message: "Server error in admin authentication" })
  }
}

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.userId).select("-password")

      if (user && user.isActive) {
        req.user = user
      }
    }

    next()
  } catch (error) {
    // Continue without user if token is invalid
    next()
  }
}

// Check if user owns the resource
const checkOwnership = (Model, paramName = "id") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName]
      const resource = await Model.findById(resourceId)

      if (!resource) {
        return res.status(404).json({ message: "Resource not found" })
      }

      if (resource.owner && resource.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Access denied - not the owner" })
      }

      req.resource = resource
      next()
    } catch (error) {
      console.error("Ownership check error:", error)
      res.status(500).json({ message: "Server error in ownership check" })
    }
  }
}

// Rate limiting for sensitive operations
const sensitiveOpLimit = require("express-rate-limit")({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for sensitive operations
  message: "Too many attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
})

module.exports = {
  auth,
  adminAuth,
  optionalAuth,
  checkOwnership,
  sensitiveOpLimit,
}
