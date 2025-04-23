import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: String,
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    phoneNumber: String,
    bio: String,
    status: String,
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: Date,
    twoFactorEnabled: { type: Boolean, default: false },
    lastPasswordChange: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
