"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { useAuth } from "./AuthContext"
import { useToast } from "@/hooks/use-toast"

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      const socketInstance = io("http://localhost:5000", {
        transports: ["websocket"],
      })

      socketInstance.on("connect", () => {
        setIsConnected(true)
        socketInstance.emit("join-room", user._id)
      })

      socketInstance.on("disconnect", () => {
        setIsConnected(false)
      })

      // Listen for notifications
      socketInstance.on("new-swap-request", (data) => {
        toast({
          title: "New Swap Request",
          description: data.message,
        })
      })

      socketInstance.on("swap-accepted", (data) => {
        toast({
          title: "Swap Accepted!",
          description: data.message,
        })
      })

      socketInstance.on("swap-rejected", (data) => {
        toast({
          title: "Swap Rejected",
          description: data.message,
          variant: "destructive",
        })
      })

      socketInstance.on("swap-completed", (data) => {
        toast({
          title: "Swap Completed!",
          description: data.message,
        })
      })

      socketInstance.on("item-reviewed", (data) => {
        toast({
          title: "Item Reviewed",
          description: data.message,
        })
      })

      socketInstance.on("item-deleted", (data) => {
        toast({
          title: "Item Removed",
          description: data.message,
          variant: "destructive",
        })
      })

      setSocket(socketInstance)

      return () => {
        socketInstance.disconnect()
      }
    }
  }, [user, toast])

  return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider")
  }
  return context
}
