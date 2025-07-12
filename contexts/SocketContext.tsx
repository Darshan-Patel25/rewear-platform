"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"
import { useAuth } from "./AuthContext"

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { user, token } = useAuth()

  useEffect(() => {
    if (user && token) {
      const socketInstance = io("http://localhost:5000", {
        auth: {
          token,
        },
      })

      socketInstance.on("connect", () => {
        console.log("Connected to server")
        setIsConnected(true)
        socketInstance.emit("join-room", user._id)
      })

      socketInstance.on("disconnect", () => {
        console.log("Disconnected from server")
        setIsConnected(false)
      })

      // Listen for real-time notifications
      socketInstance.on("new-swap-request", (data) => {
        console.log("New swap request:", data)
        // Handle new swap request notification
      })

      socketInstance.on("swap-response", (data) => {
        console.log("Swap response:", data)
        // Handle swap response notification
      })

      socketInstance.on("item-approved", (data) => {
        console.log("Item approved:", data)
        // Handle item approval notification
      })

      socketInstance.on("item-rejected", (data) => {
        console.log("Item rejected:", data)
        // Handle item rejection notification
      })

      setSocket(socketInstance)

      return () => {
        socketInstance.disconnect()
      }
    }
  }, [user, token])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider")
  }
  return context
}
