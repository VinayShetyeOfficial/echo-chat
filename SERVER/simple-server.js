const express = require("express")
const cors = require("cors")
const { MongoClient } = require("mongodb")
const User = require("../models/user")

const app = express()

// More permissive CORS settings
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  res.header("Access-Control-Allow-Methods", "*")

  // Handle preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200)
  }

  next()
})

app.use(express.json())

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// Simple ping test
app.get("/ping", (req, res) => {
  res.send("pong")
})

// Add these validation functions
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const isStrongPassword = (password) => {
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  return password.length >= 8 && password.length <= 50 && hasUppercase && hasLowercase && (hasNumber || hasSpecial)
}

const isValidUsername = (username) => {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username)
}

// Auth endpoints
app.post("/api/auth/signup", async (req, res) => {
  const { username, email, password } = req.body

  // Check if user already exists with this email
  try {
    // Simulated database check
    const users = await User.find({ email }).exec()
    if (users.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists",
        field: "email",
      })
    }

    // Check username
    const usernames = await User.find({ username }).exec()
    if (usernames.length > 0) {
      return res.status(409).json({
        message: "This username is already taken",
        field: "username",
      })
    }

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

    // All validation passed, proceed
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: "123",
        username: req.body.username,
        email: req.body.email,
        avatar: null,
        isOnline: true,
      },
      token: "test-token-123",
    })
  } catch (err) {
    // Error handling
  }
})

app.post("/api/auth/login", (req, res) => {
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

  // Authentication would happen here in a real application
  res.status(200).json({
    message: "Login successful",
    user: {
      id: "123",
      username: "testuser",
      email: req.body.email,
      avatar: null,
      isOnline: true,
    },
    token: "test-token-123",
  })
})

// MongoDB connection
const uri = "mongodb+srv://echo-chat-app:CrzFx1bzMTrWQqcn@echo-chat-cluster.9bqhags.mongodb.net/echo-chat-db"
const client = new MongoClient(uri)

// Get all users - only use in development!
app.get("/api/users", async (req, res) => {
  try {
    await client.connect()
    const database = client.db("echo-chat-db")
    const users = database.collection("users")

    // Find all users
    const allUsers = await users.find({}).toArray()

    // Return sanitized users (without passwords)
    const sanitizedUsers = allUsers.map((user) => ({
      id: user._id,
      username: user.username,
      email: user.email,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    }))

    res.status(200).json({
      message: "Users retrieved successfully",
      data: sanitizedUsers,
    })
  } catch (error) {
    console.error("Error getting users:", error)
    res.status(500).json({
      message: "Error retrieving users",
      error: error.message,
    })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Simple server running on port ${PORT}`)
  console.log(`Test URL: http://localhost:${PORT}/ping`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})
