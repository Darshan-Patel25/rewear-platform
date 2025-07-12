"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { io, type Socket } from "socket.io-client"
import { useAuth } from "./AuthContext"
import { toast } from "sonner"

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api", "") || "http://localhost:5000"

  const connectSocket = useCallback(() => {
    if (user && token && !socket) {
      const newSocket = io(API_BASE_URL, {
        auth: { token },
        transports: ["websocket"],
      })

      newSocket.on("connect", () => {
        setIsConnected(true)
        console.log("Socket connected:", newSocket.id)
      })

      newSocket.on("disconnect", () => {
        setIsConnected(false)
        console.log("Socket disconnected")
      })

      newSocket.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message)
        toast.error(`Socket connection error: ${err.message}`)
      })

      newSocket.on("newSwapRequest", (data) => {
        toast.info(`New swap request from ${data.requesterName} for your item: ${data.itemName}`)
      })

      newSocket.on("swapAccepted", (data) => {
        toast.success(`Your swap request for ${data.itemName} was accepted by ${data.accepterName}!`)
      })

      newSocket.on("swapDeclined", (data) => {
        toast.warning(`Your swap request for ${data.itemName} was declined by ${data.declinerName}.`)
      })

      newSocket.on("swapCompleted", (data) => {
        toast.success(`Swap for ${data.itemName} completed!`)
      })

      setSocket(newSocket)
    }
  }, [user, token, socket, API_BASE_URL])

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }, [socket])

  useEffect(() => {
    if (user && token) {
      connectSocket()
    } else {
      disconnectSocket()
    }

    return () => {
      disconnectSocket()
    }
  }, [user, token, connectSocket, disconnectSocket])

  return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider")
  }
  return context
}
