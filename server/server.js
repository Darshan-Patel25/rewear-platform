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
const authMiddleware = require("./middleware/auth")

const app = express()
const server = createServer(app)

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? "https://your-frontend-domain.com" : "http://localhost:3000",
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
    origin: process.env.NODE_ENV === "production" ? "https://your-frontend-domain.com" : "http://localhost:3000",
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

  // Authenticate socket connection (optional, but good for security)
  // You might want to verify the token here and associate the socket with a user ID
  const token = socket.handshake.auth.token
  if (token) {
    // Verify token and attach user info to socket if valid
    // For now, we'll just log it
    console.log("Socket authenticated with token:", token.substring(0, 10) + "...")
  }

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

  // Example: Listen for a custom event
  socket.on("sendMessage", (message) => {
    console.log("Message received:", message)
    io.emit("receiveMessage", message) // Broadcast to all connected clients
  })

  // Add more socket event handlers as needed for real-time features
})

// Make io accessible to routes
app.set("io", io)

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/items", authMiddleware, itemRoutes) // Protect item routes
app.use("/api/swaps", authMiddleware, swapRoutes) // Protect swap routes
app.use("/api/admin", authMiddleware, adminRoutes) // Protect admin routes

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
    `📱 Client URL: ${process.env.NODE_ENV === "production" ? "https://your-frontend-domain.com" : "http://localhost:3000"}`,
  )
  console.log(`🗄️  Database: ${process.env.MONGO_URI}`)
})

module.exports = app
