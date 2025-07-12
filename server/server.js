const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const compression = require("compression")
const morgan = require("morgan")
const rateLimit = require("express-rate-limit")
const { createServer } = require("http")
const { Server } = require("socket.io")
require("dotenv").config()

// Import routes
const authRoutes = require("./routes/auth")
const itemRoutes = require("./routes/items")
const swapRoutes = require("./routes/swaps")
const adminRoutes = require("./routes/admin")

const app = express()
const server = createServer(app)

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? "https://your-rewear-app.vercel.app" : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Middleware
app.use(helmet())
app.use(compression())
app.use(morgan("combined"))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})
app.use("/api/", limiter)

// CORS
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? "https://your-rewear-app.vercel.app" : "http://localhost:3000",
    credentials: true,
  }),
)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err)
    process.exit(1)
  })

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("👤 User connected:", socket.id)

  socket.on("join-room", (userId) => {
    socket.join(userId)
    console.log(`User ${userId} joined room`)
  })

  socket.on("disconnect", () => {
    console.log("👤 User disconnected:", socket.id)
  })

  // Example: Listen for a swap request event
  socket.on("sendSwapRequest", (data) => {
    console.log("Swap request received:", data)
    // Emit to the recipient of the swap request
    // You would typically look up the recipient's socket ID based on their user ID
    // For demonstration, let's assume data.recipientSocketId is provided
    if (data.recipientSocketId) {
      io.to(data.recipientSocketId).emit("newSwapRequest", {
        requesterId: data.requesterId,
        requesterUsername: data.requesterUsername,
        itemId: data.itemId,
        itemName: data.itemName,
        message: data.message,
      })
    } else {
      console.warn("No recipientSocketId provided for swap request.")
    }
  })

  // Add more socket event handlers as needed for real-time features
})

// Make io accessible to routes
app.set("io", io)

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/items", itemRoutes)
app.use("/api/swaps", swapRoutes)
app.use("/api/admin", adminRoutes)

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack)

  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation Error",
      errors: Object.values(err.errors).map((e) => e.message),
    })
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID format" })
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
})

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(
    `📱 Client URL: ${process.env.NODE_ENV === "production" ? "https://your-rewear-app.vercel.app" : "http://localhost:3000"}`,
  )
  console.log(`🗄️  Database: ${process.env.MONGO_URI}`)
})

module.exports = app
