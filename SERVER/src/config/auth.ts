import jwt from "jsonwebtoken";
import { Types } from "mongoose";

// Generate JWT token
export const generateToken = (userId: Types.ObjectId) => {
  // Get the secret from environment variable or use a fallback
  const secret =
    process.env.JWT_SECRET || "echo-social-flow-super-secret-key-23456789";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  // Convert ObjectId to string for JWT
  return jwt.sign({ id: userId.toString() }, secret, { expiresIn });
};

// Verify JWT token
export const verifyToken = (token: string) => {
  const secret =
    process.env.JWT_SECRET || "echo-social-flow-super-secret-key-23456789";
  return jwt.verify(token, secret);
};
