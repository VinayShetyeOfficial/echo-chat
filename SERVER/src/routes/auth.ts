import express, { type Request, type Response } from "express"
import bcrypt from "bcryptjs"
import { User } from "../models/User"
import { generateToken } from "../config/auth"

const router = express.Router()

// Define interfaces for request body types
interface SignupBody {
  username: string
  email: string
  password: string
}

interface LoginBody {
  email: string
  password: string
}

interface AuthResponse {
  message: string
  user?: {
    id: string
    username: string
    email: string
    avatar?: string | null
    isOnline: boolean
  }
  token?: string
  error?: string
}

// Helper function to validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Helper function to validate password strength
const isStrongPassword = (password: string): boolean => {
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  return password.length >= 8 && password.length <= 50 && hasUppercase && hasLowercase && (hasNumber || hasSpecial)
}

// Helper function to validate username
const isValidUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username)
}

// Signup route
router.post("/signup", (req: Request, res: Response) => {
  const { username, email, password } = req.body

  // Validation for all required fields
  if (!username || !email || !password) {
    return res.status(400).json({
      message: "All fields are required",
    })
  }

  // Validate username
  if (!isValidUsername(username)) {
    return res.status(400).json({
      message: "Username must be 3-30 characters and contain only letters, numbers, and underscores",
    })
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return res.status(400).json({
      message: "Please provide a valid email address",
    })
  }

  // Validate password strength
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      message: "Password must be 8-50 characters and include uppercase, lowercase, and a number or special character",
    })
  }
  // Process signup with async/await in a self-executing function
  ;(async () => {
    try {
      // Check if user exists - specifically check email first
      const userWithEmail = await User.findOne({ email })
      if (userWithEmail) {
        return res.status(409).json({
          message: "An account with this email already exists",
          field: "email",
        })
      }

      // Check username
      const userWithUsername = await User.findOne({ username })
      if (userWithUsername) {
        return res.status(409).json({
          message: "This username is already taken",
          field: "username",
        })
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Create user
      const user = new User({
        username,
        email,
        password: hashedPassword,
        isOnline: true,
        lastSeen: new Date(),
        emailVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await user.save()

      // Generate token
      const token = generateToken(user._id)

      // Return user data
      return res.status(201).json({
        message: "User created successfully",
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          isOnline: user.isOnline,
        },
        token,
      })
    } catch (error: any) {
      return res.status(500).json({
        message: "Error creating user",
        error: error.message,
      })
    }
  })()
})

// Login route
router.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    })
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return res.status(400).json({
      message: "Please provide a valid email address",
    })
  }
  // Login user with async/await in a self-executing function
  ;(async () => {
    try {
      // Find user
      const user = await User.findOne({ email })
      if (!user) {
        return res.status(401).json({
          message: "Invalid credentials",
        })
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return res.status(401).json({
          message: "Invalid credentials",
        })
      }

      // Update online status
      user.isOnline = true
      user.lastSeen = new Date()
      await user.save()

      // Generate token
      const token = generateToken(user._id)

      return res.status(200).json({
        message: "Login successful",
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          isOnline: user.isOnline,
        },
        token,
      })
    } catch (error: any) {
      return res.status(500).json({
        message: "Error logging in",
        error: error.message,
      })
    }
  })()
})

// Remove these routes if functions don't exist yet
/*
router.post("/register", createHandler(register));
router.post("/login", createHandler(login));
router.post("/forgot-password", createHandler(forgotPassword));
router.post("/reset-password", createHandler(resetPassword));
router.post("/verify-email", createHandler(verifyEmail));
*/

export default router
