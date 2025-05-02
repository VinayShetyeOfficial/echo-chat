import crypto from "crypto"

export interface JwtUser {
  id: string
  email: string
  username: string
}

/**
 * Generate a simple JWT-like token for a user
 * This is a simplified version that doesn't use the jsonwebtoken package
 * @param user User information to include in the token
 * @returns Token string
 */
export const generateToken = (user: JwtUser): string => {
  // Create a payload with user data and expiration
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days from now
  }

  // Convert payload to base64
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64")

  // Create a signature using HMAC SHA256
  const secret = process.env.JWT_SECRET || "fallback-secret"
  const signature = crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64")

  // Return the token in the format: payload.signature
  return `${payloadBase64}.${signature}`
}

/**
 * Verify a token and return the payload
 * @param token Token to verify
 * @returns Decoded token payload or null if invalid
 */
export const verifyToken = (token: string): JwtUser | null => {
  try {
    // Split the token into payload and signature
    const [payloadBase64, receivedSignature] = token.split(".")

    if (!payloadBase64 || !receivedSignature) {
      return null
    }

    // Verify the signature
    const secret = process.env.JWT_SECRET || "fallback-secret"
    const expectedSignature = crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64")

    if (receivedSignature !== expectedSignature) {
      return null
    }

    // Decode the payload
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString())

    // Check if the token has expired
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return {
      id: payload.id,
      email: payload.email,
      username: payload.username,
    }
  } catch (error) {
    return null
  }
}
