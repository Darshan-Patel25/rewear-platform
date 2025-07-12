"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import io, { type Socket } from "socket.io-client"
import { useAuth } from "./AuthContext"
import { toast } from "sonner"

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api"
  const SOCKET_SERVER_URL = API_BASE_URL.replace("/api", "") // Assuming socket server is at root of API base URL

  const connectSocket = useCallback(() => {
    if (isAuthenticated && token && !socket) {
      const newSocket = io(SOCKET_SERVER_URL, {
        auth: {
          token: token,
        },
        transports: ["websocket", "polling"],
      })

      newSocket.on("connect", () => {
        setIsConnected(true)
        console.log("Socket connected:", newSocket.id)
        toast.success("Real-time connection established!")
      })

      newSocket.on("disconnect", (reason) => {
        setIsConnected(false)
        console.log("Socket disconnected:", reason)
        toast.warning(`Real-time connection lost: ${reason}`)
        setSocket(null) // Clear socket on disconnect to allow reconnection
      })

      newSocket.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message)
        toast.error(`Socket connection error: ${err.message}`)
        setSocket(null) // Clear socket on error to allow reconnection attempts
      })

      // Example of listening for a custom event
      newSocket.on("newSwapRequest", (data) => {
        toast.info(`New swap request from ${data.requesterUsername} for your item: ${data.itemName}`)
        // You might want to update UI or state here
      })

      setSocket(newSocket)
    }
  }, [isAuthenticated, token, socket, SOCKET_SERVER_URL])

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
      console.log("Socket manually disconnected.")
    }
  }, [socket])

  useEffect(() => {
    if (isAuthenticated && token && !socket) {
      connectSocket()
    } else if (!isAuthenticated && socket) {
      disconnectSocket()
    }

    // Clean up on component unmount
    return () => {
      if (socket) {
        socket.off("connect")
        socket.off("disconnect")
        socket.off("connect_error")
        socket.off("newSwapRequest")
        socket.disconnect()
        setSocket(null)
      }
    }
  }, [isAuthenticated, token, socket, connectSocket, disconnectSocket])

  return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider")
  }
  return context
}
