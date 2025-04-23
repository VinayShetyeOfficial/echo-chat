import { Request, Response } from "express";
import { prisma } from "../index";
import crypto from "crypto";

/**
 * Create a new invitation link
 * @route POST /api/invitations
 * @access Private
 */
export const createInvitation = async (req: Request, res: Response) => {
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

    const { email, channelId, expiresIn = 7 } = req.body;

    // Generate a random invite code
    const code = crypto.randomBytes(6).toString("hex");

    // Set expiration date (default 7 days)
    const expires = new Date();
    expires.setDate(expires.getDate() + expiresIn);

    // Create the invitation in the database
    const invitation = await prisma.invitation.create({
      data: {
        code,
        createdById: userId,
        email,
        channelId,
        expires,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: invitation,
    });
  } catch (error) {
    console.error("Create invitation error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not create invitation",
        statusCode: 500,
        code: "INVITATION_FAILED",
      },
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
    const invitation = await prisma.invitation.findUnique({
      where: { code },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    // Check if invitation exists
    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Invitation not found",
          statusCode: 404,
          code: "INVITATION_NOT_FOUND",
        },
      });
    }

    // Check if invitation has expired
    if (invitation.expires < new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invitation has expired",
          statusCode: 400,
          code: "INVITATION_EXPIRED",
        },
      });
    }

    // Check if invitation has been used
    if (invitation.used) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invitation has already been used",
          statusCode: 400,
          code: "INVITATION_USED",
        },
      });
    }

    // Return invitation details
    res.status(200).json({
      success: true,
      data: {
        invitation: {
          code: invitation.code,
          createdBy: invitation.createdBy,
          channel: invitation.channel,
          expires: invitation.expires,
        },
      },
    });
  } catch (error) {
    console.error("Verify invitation error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not verify invitation",
        statusCode: 500,
        code: "VERIFICATION_FAILED",
      },
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
        success: false,
        error: {
          message: "Not authenticated",
          statusCode: 401,
          code: "NOT_AUTHENTICATED",
        },
      });
    }

    const { code } = req.params;

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { code },
      include: {
        channel: true,
      },
    });

    // Check if invitation exists
    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Invitation not found",
          statusCode: 404,
          code: "INVITATION_NOT_FOUND",
        },
      });
    }

    // Check if invitation has expired
    if (invitation.expires < new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invitation has expired",
          statusCode: 400,
          code: "INVITATION_EXPIRED",
        },
      });
    }

    // Check if invitation has been used
    if (invitation.used) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invitation has already been used",
          statusCode: 400,
          code: "INVITATION_USED",
        },
      });
    }

    // Mark invitation as used
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        used: true,
        usedAt: new Date(),
        usedById: userId,
      },
    });

    // If the invitation is for a channel, add the user to the channel
    if (invitation.channelId) {
      // Check if user is already a member of the channel
      const existingMember = await prisma.channelMember.findUnique({
        where: {
          channelId_userId: {
            channelId: invitation.channelId,
            userId,
          },
        },
      });

      if (!existingMember) {
        // Add user to the channel
        await prisma.channelMember.create({
          data: {
            channelId: invitation.channelId,
            userId,
            role: "member",
          },
        });
      }

      // Return channel details
      return res.status(200).json({
        success: true,
        data: {
          message: "Successfully joined the channel",
          channel: invitation.channel,
        },
      });
    }

    // If not a channel invite, it's a general app invite
    res.status(200).json({
      success: true,
      data: {
        message: "Invitation successfully redeemed",
      },
    });
  } catch (error) {
    console.error("Redeem invitation error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not redeem invitation",
        statusCode: 500,
        code: "REDEMPTION_FAILED",
      },
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
        success: false,
        error: {
          message: "Not authenticated",
          statusCode: 401,
          code: "NOT_AUTHENTICATED",
        },
      });
    }

    const invitations = await prisma.invitation.findMany({
      where: { createdById: userId },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    console.error("Get user invitations error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not retrieve invitations",
        statusCode: 500,
        code: "RETRIEVAL_FAILED",
      },
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
    const invitation = await prisma.invitation.findUnique({
      where: { code },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    // Check if invitation exists
    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Invitation not found",
          statusCode: 404,
          code: "INVITATION_NOT_FOUND",
        },
      });
    }

    // Check if invitation has expired
    if (invitation.expires < new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invitation has expired",
          statusCode: 400,
          code: "INVITATION_EXPIRED",
        },
      });
    }

    // Check if invitation has been used
    if (invitation.used) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invitation has already been used",
          statusCode: 400,
          code: "INVITATION_USED",
        },
      });
    }

    // Return invitation details
    res.status(200).json({
      success: true,
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
  } catch (error) {
    console.error("Get public invite details error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not retrieve invitation details",
        statusCode: 500,
        code: "RETRIEVAL_FAILED",
      },
    });
  }
};
