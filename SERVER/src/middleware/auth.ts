import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { User } from "../models/User"

// Extend the Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" })
    }

    const token = authHeader.split(" ")[1]

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any

    // Find user
    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(401).json({ message: "Invalid token" })
    }

    // Add user to request
    req.user = user

    next()
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" })
  }
}

// Export protect as an alias for authMiddleware to maintain compatibility
export const protect = authMiddleware
