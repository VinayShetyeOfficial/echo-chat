import type { Request, Response } from "express";
import crypto from "crypto";
import { Invitation } from "../models/Invitation";
import { Channel } from "../models/Channel";

/**
 * Create a new invitation link
 * @route POST /api/invitations
 * @access Private
 */
export const createInvitation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { email, channelId, expiresIn = 24 } = req.body;

    // Generate a random invite code
    const code = crypto.randomBytes(6).toString("hex");

    // Set expiration date (default 24 hours)
    const expires = new Date();
    expires.setHours(expires.getHours() + expiresIn);

    // Create the invitation in the database
    const invitation = new Invitation({
      code,
      createdBy: userId,
      email,
      channelId,
      expires,
    });

    await invitation.save();

    // Populate creator and channel info
    await invitation.populate("createdBy", "id username email avatar");
    if (channelId) {
      await invitation.populate("channel", "id name type");
    }

    return res.status(201).json({
      message: "Invitation created successfully",
      data: invitation,
    });
  } catch (error: any) {
    console.error("Create invitation error:", error);
    return res.status(500).json({
      message: "Could not create invitation",
      error: error.message,
    });
  }
};

/**
 * Verify an invitation link - check if it's valid without redeeming it
 * @route GET /api/invitations/:code/verify
 * @access Public
 */
export const verifyInvitation = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    // Find the invitation
    const invitation = await Invitation.findOne({ code })
      .populate("createdBy", "id username avatar")
      .populate("channel", "id name type");

    // Check if invitation exists
    if (!invitation) {
      return res.status(404).json({
        message: "Invitation not found",
      });
    }

    // Check if invitation has expired
    if (invitation.expires < new Date()) {
      return res.status(400).json({
        message: "Invitation has expired",
      });
    }

    // Check if invitation has been used
    if (invitation.used) {
      return res.status(400).json({
        message: "Invitation has already been used",
      });
    }

    // Return invitation details
    return res.status(200).json({
      message: "Valid invitation",
      data: {
        invitation: {
          code: invitation.code,
          createdBy: invitation.createdBy,
          channel: invitation.channel,
          expires: invitation.expires,
        },
      },
    });
  } catch (error: any) {
    console.error("Verify invitation error:", error);
    return res.status(500).json({
      message: "Could not verify invitation",
      error: error.message,
    });
  }
};

/**
 * Redeem an invitation - join the channel or register via invite
 * @route POST /api/invitations/:code/redeem
 * @access Private
 */
export const redeemInvitation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const { code } = req.params;

    // Find the invitation
    const invitation = await Invitation.findOne({ code }).populate("channel");

    // Check if invitation exists
    if (!invitation) {
      return res.status(404).json({
        message: "Invitation not found",
      });
    }

    // Check if invitation has expired
    if (invitation.expires < new Date()) {
      return res.status(400).json({
        message: "Invitation has expired",
      });
    }

    // Check if invitation has been used
    if (invitation.used) {
      return res.status(400).json({
        message: "Invitation has already been used",
      });
    }

    // Mark invitation as used
    invitation.used = true;
    invitation.usedAt = new Date();
    invitation.usedBy = userId;
    await invitation.save();

    // If the invitation is for a channel, add the user to the channel
    if (invitation.channelId) {
      // Check if user is already a member of the channel
      const existingMember = await Channel.findOne({
        _id: invitation.channelId,
        "members.userId": userId,
      });

      if (!existingMember) {
        // Add user to the channel
        await Channel.findByIdAndUpdate(invitation.channelId, {
          $push: {
            members: {
              userId,
              role: "member",
              joinedAt: new Date(),
            },
          },
        });
      }

      // Return channel details
      return res.status(200).json({
        message: "Successfully joined the channel",
        data: {
          channel: invitation.channel,
        },
      });
    }

    // If not a channel invite, it's a general app invite
    return res.status(200).json({
      message: "Invitation successfully redeemed",
    });
  } catch (error: any) {
    console.error("Redeem invitation error:", error);
    return res.status(500).json({
      message: "Could not redeem invitation",
      error: error.message,
    });
  }
};

/**
 * Get all invitations for the current user (as creator)
 * @route GET /api/invitations
 * @access Private
 */
export const getUserInvitations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const invitations = await Invitation.find({ createdBy: userId })
      .populate("channel", "id name type")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Invitations retrieved successfully",
      data: invitations,
    });
  } catch (error: any) {
    console.error("Get user invitations error:", error);
    return res.status(500).json({
      message: "Could not retrieve invitations",
      error: error.message,
    });
  }
};

/**
 * Public endpoint to check invitation status - for use without authentication
 * @route GET /api/invitations/:code/public
 * @access Public
 */
export const getPublicInviteDetails = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    // Find the invitation
    const invitation = await Invitation.findOne({ code })
      .populate("createdBy", "id username avatar")
      .populate("channel", "id name type");

    // Check if invitation exists
    if (!invitation) {
      return res.status(404).json({
        message: "Invitation not found",
      });
    }

    // Check if invitation has expired
    if (invitation.expires < new Date()) {
      return res.status(400).json({
        message: "Invitation has expired",
      });
    }

    // Check if invitation has been used
    if (invitation.used) {
      return res.status(400).json({
        message: "Invitation has already been used",
      });
    }

    // Return invitation details
    return res.status(200).json({
      message: "Valid invitation",
      data: {
        invitation: {
          code: invitation.code,
          createdBy: invitation.createdBy,
          channel: invitation.channel,
          expires: invitation.expires,
        },
        requiresAuthentication: true,
      },
    });
  } catch (error: any) {
    console.error("Get public invite details error:", error);
    return res.status(500).json({
      message: "Could not retrieve invitation details",
      error: error.message,
    });
  }
};
