import express from "express";
import { authMiddleware } from "../middleware/auth";
import { Invitation } from "../models/Invitation";
import crypto from "crypto";

const router = express.Router();

// Create a new invitation
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { email, channelId, expiresIn = 24 } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Generate a random invite code
    const code = crypto.randomBytes(6).toString("hex");

    // Set expiration date (default 24 hours)
    const expires = new Date();
    expires.setHours(expires.getHours() + expiresIn);

    // Create the invitation
    const invitation = new Invitation({
      code,
      createdBy: userId,
      email,
      channelId,
      expires,
      used: false,
    });

    await invitation.save();

    return res.status(201).json({
      message: "Invitation created successfully",
      data: invitation,
    });
  } catch (error: any) {
    console.error("Create invitation error:", error);
    return res.status(500).json({
      message: "Error creating invitation",
      error: error.message,
    });
  }
});

// Verify an invitation (public endpoint)
router.get("/:code/verify", async (req, res) => {
  try {
    const { code } = req.params;

    // Find the invitation
    const invitation = await Invitation.findOne({ code }).populate(
      "createdBy",
      "username avatar"
    );

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    // Check if expired
    if (invitation.expires < new Date()) {
      return res.status(400).json({ message: "Invitation has expired" });
    }

    // Check if already used
    if (invitation.used) {
      return res
        .status(400)
        .json({ message: "Invitation has already been used" });
    }

    // Return invitation details
    return res.status(200).json({
      message: "Invitation is valid",
      data: {
        invitation: {
          code: invitation.code,
          createdBy: invitation.createdBy,
          channel: invitation.channelId,
          expires: invitation.expires,
        },
      },
    });
  } catch (error: any) {
    console.error("Verify invitation error:", error);
    return res.status(500).json({
      message: "Error verifying invitation",
      error: error.message,
    });
  }
});

// Redeem an invitation
router.post("/:code/redeem", authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find the invitation
    const invitation = await Invitation.findOne({ code });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    // Check if expired
    if (invitation.expires < new Date()) {
      return res.status(400).json({ message: "Invitation has expired" });
    }

    // Check if already used
    if (invitation.used) {
      return res
        .status(400)
        .json({ message: "Invitation has already been used" });
    }

    // Mark as used
    invitation.used = true;
    invitation.usedAt = new Date();
    invitation.usedBy = userId;
    await invitation.save();

    // If this is a channel invitation, add the user to the channel
    if (invitation.channelId) {
      // Add logic to add user to channel
      // This depends on your channel membership model
    }

    return res.status(200).json({
      message: "Invitation redeemed successfully",
      data: {
        channelId: invitation.channelId,
      },
    });
  } catch (error: any) {
    console.error("Redeem invitation error:", error);
    return res.status(500).json({
      message: "Error redeeming invitation",
      error: error.message,
    });
  }
});

// Get all invitations for the current user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const invitations = await Invitation.find({ createdBy: userId })
      .populate("createdBy", "username avatar")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Invitations retrieved successfully",
      data: invitations,
    });
  } catch (error: any) {
    console.error("Get invitations error:", error);
    return res.status(500).json({
      message: "Error retrieving invitations",
      error: error.message,
    });
  }
});

// Public endpoint for invitation details
router.get("/:code/public", async (req, res) => {
  try {
    const { code } = req.params;

    // Find the invitation
    const invitation = await Invitation.findOne({ code }).populate(
      "createdBy",
      "username avatar"
    );

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    // Check if expired
    if (invitation.expires < new Date()) {
      return res.status(400).json({ message: "Invitation has expired" });
    }

    // Check if already used
    if (invitation.used) {
      return res
        .status(400)
        .json({ message: "Invitation has already been used" });
    }

    // Return invitation details
    return res.status(200).json({
      message: "Invitation is valid",
      data: {
        invitation: {
          code: invitation.code,
          createdBy: invitation.createdBy,
          channel: invitation.channelId,
          expires: invitation.expires,
        },
        requiresAuthentication: true,
      },
    });
  } catch (error: any) {
    console.error("Get public invitation details error:", error);
    return res.status(500).json({
      message: "Error retrieving invitation details",
      error: error.message,
    });
  }
});

export default router;
