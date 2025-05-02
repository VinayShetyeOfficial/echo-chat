import jwt from "jsonwebtoken"

export interface JwtUser {
  id: string
  email: string
  username: string
}

/**
 * Generate a JWT token for a user
 * @param user User information to include in the token
 * @returns JWT token string
 */
export const generateToken = (user: JwtUser): string => {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
  }
  const secret = process.env.JWT_SECRET || "fallback-secret"

  // Call jwt.sign directly with the options object
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  })
}

/**
 * Verify a JWT token and return the payload
 * @param token JWT token to verify
 * @returns Decoded token payload or null if invalid
 */
export const verifyToken = (token: string): JwtUser | null => {
  try {
    const secret = process.env.JWT_SECRET || "fallback-secret"
    const decoded = jwt.verify(token, secret) as JwtUser
    return decoded
  } catch (error) {
    return null
  }
}
