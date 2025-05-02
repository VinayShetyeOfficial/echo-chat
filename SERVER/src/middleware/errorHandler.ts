import type { Request, Response, NextFunction } from "express"

interface AppError extends Error {
  statusCode?: number
  code?: string
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err)

  // Default error values
  let statusCode = err.statusCode || 500
  let message = err.message || "Something went wrong on the server"

  // Handle Prisma specific errors
  if (err.name === "PrismaClientKnownRequestError") {
    const code = (err as any).code
    switch (code) {
      case "P2002": // Unique constraint violation
        statusCode = 409
        message = "A record with this information already exists"
        break
      case "P2025": // Record not found
        statusCode = 404
        message = "Record not found"
        break
      default:
        statusCode = 400
        message = "Database error"
    }
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    statusCode = 400
    message = err.message
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401
    message = "Invalid or expired token"
  }

  // Send standardized error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: err.code || "SERVER_ERROR",
      statusCode,
    },
  })
}
