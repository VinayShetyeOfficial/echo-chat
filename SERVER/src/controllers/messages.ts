import { Request, Response } from "express";
import { Message } from "../models/Message";
import { Channel } from "../models/Channel";
import { SocketManager } from "../services/socketManager";

// Get the SocketManager instance from the app
const getSocketManager = (req: Request): SocketManager => {
  return req.app.get("socketManager") as SocketManager;
};

// Create a new message
export const createMessage = async (req: Request, res: Response) => {
  try {
    const { text, channelId, replyToId } = req.body;
    const userId = (req as any).user.id;

    console.log("[DEBUG] createMessage controller is running!");
    console.log("POST /messages received:", {
      text: text?.substring(0, 20) + "...",
      channelId,
      userId,
      replyToId: replyToId || "undefined (not replying)",
    });

    // Validate required fields
    if (!text || !channelId) {
      return res.status(400).json({ error: "Text and channelId are required" });
    }

    // Check if channel exists and user is a member
    const channel = await Channel.findById(channelId).populate(
      "members.userId"
    );
    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    const isMember = channel.members.some(
      (member: any) => member.userId._id.toString() === userId
    );
    if (!isMember) {
      return res.status(403).json({ error: "Not a member of this channel" });
    }

    // Create the message
    const message = new Message({
      text,
      sender: userId,
      channelId: channelId,
      replyTo: replyToId || undefined,
    });

    const savedMessage = await message.save();
    console.log("Message saved with ID:", savedMessage._id);

    // Populate sender information
    await savedMessage.populate("sender", "username email");

    // Update channel's last message
    await Channel.findByIdAndUpdate(channelId, {
      lastMessage: savedMessage._id,
      updatedAt: new Date(),
    });

    // Emit real-time message to channel
    try {
      console.log(`[MessageController] Getting SocketManager instance...`);
      const socketManager = getSocketManager(req);

      if (!socketManager) {
        console.error("[MessageController] SocketManager is null/undefined!");
        return;
      }

      console.log(
        `[MessageController] Attempting to emit new_message to channel ${channelId}`
      );

      socketManager.emitToChannel(channelId, "new_message", savedMessage);

      console.log(
        `[MessageController] Successfully emitted new_message to channel ${channelId}`
      );
    } catch (socketError) {
      console.error("[MessageController] Socket emission error:", socketError);
      // Don't fail the request if socket emission fails
    }

    res.status(201).json({
      message: "Message created successfully",
      data: savedMessage,
    });
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({ error: "Failed to create message" });
  }
};

// Get messages for a channel
export const getMessages = async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = (req as any).user.id;

    // Check if user is a member of the channel
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    const isMember = channel.members.some(
      (member: any) => member.userId.toString() === userId
    );
    if (!isMember) {
      return res.status(403).json({ error: "Not a member of this channel" });
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get messages with pagination
    const messages = await Message.find({ channelId: channelId })
      .populate("sender", "username email")
      .populate("replyTo", "text sender")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const total = await Message.countDocuments({ channelId: channelId });

    res.json({
      messages: messages.reverse(), // Reverse to get chronological order
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({ error: "Failed to get messages" });
  }
};

// Update a message
export const updateMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = (req as any).user.id;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Find message and check ownership
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.sender.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to edit this message" });
    }

    // Update message
    message.text = text;
    message.isEdited = true;
    message.editHistory.push({ text: message.text, editedAt: new Date() });
    const updatedMessage = await message.save();

    await updatedMessage.populate("sender", "username email");

    // Emit real-time update to channel
    try {
      const socketManager = getSocketManager(req);
      socketManager.emitToChannel(
        message.channelId.toString(),
        "message_updated",
        {
          message: updatedMessage,
          channelId: message.channelId.toString(),
        }
      );
      console.log(
        `[MessageController] Emitted message_updated to channel ${message.channelId}`
      );
    } catch (socketError) {
      console.error("[MessageController] Socket emission error:", socketError);
    }

    res.json({
      message: "Message updated successfully",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Error updating message:", error);
    res.status(500).json({ error: "Failed to update message" });
  }
};

// Delete a message
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = (req as any).user.id;

    // Find message and check ownership
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.sender.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this message" });
    }

    const channelId = message.channelId.toString();

    // Delete message
    await Message.findByIdAndDelete(messageId);

    // Emit real-time deletion to channel
    try {
      const socketManager = getSocketManager(req);
      socketManager.emitToChannel(channelId, "message_deleted", {
        messageId: messageId,
        channelId: channelId,
      });
      console.log(
        `[MessageController] Emitted message_deleted to channel ${channelId}`
      );
    } catch (socketError) {
      console.error("[MessageController] Socket emission error:", socketError);
    }

    res.json({
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

// React to a message
export const reactToMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;
    const userId = (req as any).user.id;

    if (!reaction) {
      return res.status(400).json({ error: "Reaction is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Add or update reaction
    const existingReactionIndex = message.reactions.findIndex((r: any) =>
      r.users.includes(userId)
    );

    if (existingReactionIndex > -1) {
      // Update existing reaction
      message.reactions[existingReactionIndex].emoji = reaction;
    } else {
      // Add new reaction
      message.reactions.push({ emoji: reaction, users: [userId] });
    }

    const updatedMessage = await message.save();
    await updatedMessage.populate("sender", "username email");

    // Emit real-time reaction to channel
    try {
      const socketManager = getSocketManager(req);
      socketManager.emitToChannel(
        message.channelId.toString(),
        "message_reaction",
        {
          message: updatedMessage,
          channelId: message.channelId.toString(),
        }
      );
      console.log(
        `[MessageController] Emitted message_reaction to channel ${message.channelId}`
      );
    } catch (socketError) {
      console.error("[MessageController] Socket emission error:", socketError);
    }

    res.json({
      message: "Reaction added successfully",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Error adding reaction:", error);
    res.status(500).json({ error: "Failed to add reaction" });
  }
};
