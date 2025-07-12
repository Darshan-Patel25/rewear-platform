const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
const connectDB = require("./config/db")
const http = require("http")
const { Server } = require("socket.io")

// Load env vars
dotenv.config({ path: "./server/.env" })

// Connect to database
connectDB()

const app = express()
const server = http.createServer(app)

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_SOCKET_URL
      ? new URL(process.env.NEXT_PUBLIC_SOCKET_URL).origin
      : "http://localhost:3000", // Allow client origin
    methods: ["GET", "POST"],
  },
})

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id)

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
  })

  // Example: Listen for a 'sendMessage' event from the client
  socket.on("sendMessage", (message) => {
    console.log("Message received:", message)
    // Broadcast the message to all connected clients
    io.emit("receiveMessage", message)
  })

  // You can add more socket event handlers here
})

// Body parser
app.use(express.json())

// Enable CORS
app.use(cors())

// Route files
const authRoutes = require("./routes/auth")
const itemRoutes = require("./routes/items")
const swapRoutes = require("./routes/swaps")
const adminRoutes = require("./routes/admin") // Assuming you'll create this

// Mount routers
app.use("/api/auth", authRoutes)
app.use("/api/items", itemRoutes)
app.use("/api/swaps", swapRoutes)
app.use("/api/admin", adminRoutes) // Mount admin routes

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error(`Error: ${err.message}`)
  // Close server & exit process
  server.close(() => process.exit(1))
})
