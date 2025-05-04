import type { Request, Response } from "express";
import { prisma } from "../index";
import bcrypt from "bcrypt";
import { Invitation } from "../models/Invitation";
import { User } from "../models/User";
import mongoose from "mongoose";

/**
 * Get current user profile
 * @route GET /api/users/me
 * @access Private
 */
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated",
          statusCode: 401,
          code: "NOT_AUTHENTICATED",
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
        bio: true,
        status: true,
        phoneNumber: true,
        createdAt: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: "User not found",
          statusCode: 404,
          code: "USER_NOT_FOUND",
        },
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not get user profile",
        statusCode: 500,
        code: "PROFILE_ERROR",
      },
    });
  }
};

/**
 * Update current user profile
 * @route PUT /api/users/me
 * @access Private
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated",
          statusCode: 401,
          code: "NOT_AUTHENTICATED",
        },
      });
    }

    const {
      username,
      avatar,
      bio,
      status,
      phoneNumber,
      currentPassword,
      newPassword,
    } = req.body;

    // Check if trying to update password
    if (currentPassword && newPassword) {
      // Verify current password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: "User not found",
            statusCode: 404,
            code: "USER_NOT_FOUND",
          },
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Current password is incorrect",
            statusCode: 400,
            code: "INVALID_PASSWORD",
          },
        });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update user with new password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          lastPasswordChange: new Date(),
        },
      });
    }

    // Update user profile
    const updatedData: any = {};
    if (username) updatedData.username = username;
    if (avatar) updatedData.avatar = avatar;
    if (bio !== undefined) updatedData.bio = bio;
    if (status !== undefined) updatedData.status = status;
    if (phoneNumber !== undefined) updatedData.phoneNumber = phoneNumber;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updatedData,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
        bio: true,
        status: true,
        phoneNumber: true,
        createdAt: true,
        emailVerified: true,
      },
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not update profile",
        statusCode: 500,
        code: "PROFILE_UPDATE_ERROR",
      },
    });
  }
};

/**
 * Get all users
 * @route GET /api/users
 * @access Private
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated",
          statusCode: 401,
          code: "NOT_AUTHENTICATED",
        },
      });
    }

    // Find all users that the current user can see
    // This includes:
    // 1. Users who have invited the current user
    // 2. Users who the current user has invited
    // 3. Users who are in the same channels as the current user

    // Convert userId to ObjectId for MongoDB queries
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find invitations where current user is the creator
    const sentInvitations = await Invitation.find({
      createdBy: userObjectId,
    });

    // Find invitations where current user was invited (by code or by other users)
    const receivedInvitations = await Invitation.find({
      $or: [
        { code: { $in: ["ae7fca312247", "2ff7dbe6fb06", "047ff4f48039"] } },
        { createdBy: { $ne: userObjectId } },
      ],
    }).populate("createdBy");

    console.log("Sent invitations:", sentInvitations);
    console.log("Received invitations:", receivedInvitations);

    // Get unique user IDs from invitations - properly extract just the IDs
    const invitedUserIds = sentInvitations
      .filter((inv) => inv.usedBy)
      .map((inv) => inv.usedBy?.toString())
      .filter(Boolean); // Remove any undefined values

    // Extract just the ID from the populated createdBy objects
    const inviterUserIds = receivedInvitations
      .filter((inv) => inv.createdBy)
      .map((inv) => {
        // Check if createdBy is an object with _id or just an ID
        if (
          inv.createdBy &&
          typeof inv.createdBy === "object" &&
          inv.createdBy._id
        ) {
          return inv.createdBy._id.toString();
        }
        // If it's already an ID (string or ObjectId)
        if (inv.createdBy) {
          return inv.createdBy.toString();
        }
        return null;
      })
      .filter(Boolean); // Remove any null values

    // Get all users who have created invitations
    const allInvitationCreators = await Invitation.distinct("createdBy");
    const creatorIds = allInvitationCreators.map((id) => id.toString());

    // Combine all unique user IDs
    const connectedUserIds = [
      ...new Set([...invitedUserIds, ...inviterUserIds, ...creatorIds]),
    ];

    console.log("Connected user IDs:", connectedUserIds);

    // Find all users that are connected to the current user
    const users = await User.find({
      $or: [
        {
          _id: {
            $in: connectedUserIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
        { _id: { $ne: userObjectId } }, // Include all users except current user for testing
      ],
    }).select("id username email avatar isOnline lastSeen status");

    console.log(
      "Found users:",
      users.map((u) => u.username)
    );

    // Filter out the current user from the results
    const filteredUsers = users.filter(
      (user) => user._id.toString() !== userId
    );

    res.status(200).json({
      success: true,
      data: filteredUsers,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not get users",
        statusCode: 500,
        code: "USERS_ERROR",
      },
    });
  }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 * @access Private
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated",
          statusCode: 401,
          code: "NOT_AUTHENTICATED",
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
        bio: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: "User not found",
          statusCode: 404,
          code: "USER_NOT_FOUND",
        },
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not get user",
        statusCode: 500,
        code: "USER_ERROR",
      },
    });
  }
};
