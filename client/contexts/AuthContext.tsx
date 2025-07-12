"use client"

import type React from "react"
import { createContext, useState, useContext, useEffect, useCallback } from "react"
import { toast } from "sonner"

interface AuthContextType {
  user: any | null
  token: string | null
  login: (userData: any, authToken: string) => void
  logout: () => void
  checkAuth: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

  const login = useCallback((userData: any, authToken: string) => {
    localStorage.setItem("token", authToken)
    setUser(userData)
    setToken(authToken)
    toast.success("Logged in successfully!")
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    setUser(null)
    setToken(null)
    toast.info("Logged out.")
  }, [])

  const checkAuth = useCallback(async () => {
    setLoading(true)
    const storedToken = localStorage.getItem("token")
    if (storedToken) {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setToken(storedToken)
        } else {
          logout()
        }
      } catch (error) {
        console.error("Failed to check auth:", error)
        logout()
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [API_BASE_URL, logout])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, checkAuth, loading }}>{children}</AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
