import type { Request, Response } from "express"
import bcrypt from "bcrypt"
import { prisma } from "../index"
import { generateToken } from "../utils/simpleJwt"
import crypto from "crypto"

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body

    // Check if user already exists
    const userExists = await prisma.user.findUnique({
      where: { email },
    })

    if (userExists) {
      return res.status(409).json({
        success: false,
        error: {
          message: "User with this email already exists",
          statusCode: 409,
          code: "EMAIL_EXISTS",
        },
      })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        emailVerification: {
          create: {
            verified: false,
          },
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        emailVerified: true,
      },
    })

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex")

    // Store token in DB
    await prisma.oTPCode.create({
      data: {
        code: verificationToken,
        userId: user.id,
        type: "verification",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    })

    // TODO: Send verification email

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    })

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    })
  } catch (error) {
    console.error("Register error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not register user",
        statusCode: 500,
        code: "REGISTRATION_FAILED",
      },
    })
  }
}

/**
 * Login a user
 * @route POST /api/auth/login
 * @access Public
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        avatar: true,
        emailVerified: true,
      },
    })

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid credentials",
          statusCode: 401,
          code: "INVALID_CREDENTIALS",
        },
      })
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid credentials",
          statusCode: 401,
          code: "INVALID_CREDENTIALS",
        },
      })
    }

    // Update user's online status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastSeen: new Date(),
      },
    })

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    res.status(200).json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not log in",
        statusCode: 500,
        code: "LOGIN_FAILED",
      },
    })
  }
}

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 * @access Public
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // If no user is found, still respond with success to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        data: {
          message: "If your email exists in our system, you will receive a password reset link.",
        },
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")

    // Store token in database
    await prisma.passwordReset.create({
      data: {
        token: resetToken,
        userId: user.id,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    // TODO: Send password reset email

    res.status(200).json({
      success: true,
      data: {
        message: "If your email exists in our system, you will receive a password reset link.",
      },
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not process request",
        statusCode: 500,
        code: "REQUEST_FAILED",
      },
    })
  }
}

/**
 * Reset password with token
 * @route POST /api/auth/reset-password
 * @access Public
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body

    // Find password reset token
    const passwordReset = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    })

    // Check if token exists and hasn't expired
    if (!passwordReset || passwordReset.expires < new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid or expired token",
          statusCode: 400,
          code: "INVALID_TOKEN",
        },
      })
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Update user's password
    await prisma.user.update({
      where: { id: passwordReset.userId },
      data: {
        password: hashedPassword,
        lastPasswordChange: new Date(),
      },
    })

    // Delete all password reset tokens for this user
    await prisma.passwordReset.deleteMany({
      where: { userId: passwordReset.userId },
    })

    res.status(200).json({
      success: true,
      data: {
        message: "Password has been reset successfully. You can now log in with your new password.",
      },
    })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not reset password",
        statusCode: 500,
        code: "RESET_FAILED",
      },
    })
  }
}

/**
 * Verify email with token
 * @route POST /api/auth/verify-email
 * @access Public
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body

    // Find verification token
    const verificationCode = await prisma.oTPCode.findFirst({
      where: {
        code: token,
        type: "verification",
      },
      include: { user: true },
    })

    // Check if token exists and hasn't expired
    if (!verificationCode || verificationCode.expires < new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid or expired verification link",
          statusCode: 400,
          code: "INVALID_TOKEN",
        },
      })
    }

    // Update user's email verification status
    await prisma.user.update({
      where: { id: verificationCode.userId },
      data: {
        emailVerified: true,
        emailVerification: {
          update: {
            verified: true,
            verifiedAt: new Date(),
          },
        },
      },
    })

    // Delete used token
    await prisma.oTPCode.delete({
      where: { id: verificationCode.id },
    })

    res.status(200).json({
      success: true,
      data: {
        message: "Email verified successfully. You can now log in.",
      },
    })
  } catch (error) {
    console.error("Email verification error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not verify email",
        statusCode: 500,
        code: "VERIFICATION_FAILED",
      },
    })
  }
}
