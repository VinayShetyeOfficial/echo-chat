"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { authApi } from "../lib/api"
import { toast } from "sonner"
import axios from "axios"

// Define types
interface User {
  id: string
  username: string
  email: string
  avatar?: string
  isOnline: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (username: string, email: string, password: string) => Promise<boolean>
  logout: () => void
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setAuthenticated] = useState(false)

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token")
    const storedUser = localStorage.getItem("user") || localStorage.getItem("currentUser")

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        // Ensure the user object uses 'id'
        const processedUser = {
          ...parsedUser,
          id: parsedUser.id || parsedUser._id, // Map _id to id if id doesn't exist
          _id: undefined, // Optionally remove _id
        }
        setUser(processedUser)
        setAuthenticated(true)
      } catch (err) {
        console.error("Error parsing stored user:", err)
        // Clear invalid stored data
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        localStorage.removeItem("currentUser")
      }
    }

    setLoading(false)
  }, [])

  // Login function
  const login = async (email: string, password: string) => {
    try {
      // Don't set loading here - Auth.tsx is managing loading state
      const data = await authApi.login(email, password)

      // Ensure the user object uses 'id'
      const processedUser = {
        ...data.user,
        id: data.user.id || data.user._id, // Map _id to id
        _id: undefined, // Optionally remove _id
      }

      // Store user data and token
      localStorage.setItem("token", data.token)
      localStorage.setItem("currentUser", JSON.stringify(processedUser))

      // Update auth state
      setUser(processedUser)
      setAuthenticated(true)

      return true
    } catch (error: any) {
      // Throw the error back to Auth.tsx to handle
      throw error
    }
  }

  // Fallback signup with axios
  const axiosSignup = async (username: string, email: string, password: string) => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:3001/api/auth/signup",
        {
          username,
          email,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      const { user, token } = response.data

      // Save user data
      setUser(user)
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))

      return { user, token }
    } catch (error) {
      console.error("Axios signup error:", error)
      throw error
    }
  }

  // Update the signup function in AuthContext.tsx
  const signup = async (username: string, email: string, password: string) => {
    try {
      const data = await authApi.signup(username, email, password)
      return true
    } catch (error: any) {
      console.log("Signup error in AuthContext:", error)

      // If the server returns a message about an existing user, create a simpler error
      if (
        error.message?.toLowerCase().includes("already exists") ||
        error.message?.toLowerCase().includes("user already exists")
      ) {
        throw new Error("Account already exists")
      }

      // Pass through other errors
      throw error
    }
  }

  // Logout function
  const logout = () => {
    setUser(null)
    setAuthenticated(false)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("currentUser")
    toast.info("You have been logged out.")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
