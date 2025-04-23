import express, { Request, Response } from "express";
import { protect } from "../middleware/auth";
import { Message } from "../models/Message";
import { Channel } from "../models/Channel";

const router = express.Router();

// All routes in this router require authentication
router.use(protect as express.RequestHandler);

// Get messages for a channel
router.get("/", (req: Request, res: Response) => {
  const { channelId } = req.query;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!channelId) {
    return res.status(400).json({ message: "Channel ID is required" });
  }

  // Process with async/await in a self-executing function
  (async () => {
    try {
      // Check if user is a member of the channel
      const channel = await Channel.findById(channelId);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      const isMember = channel.members.some(
        (member) => member.userId.toString() === userId
      );

      if (!isMember) {
        return res
          .status(403)
          .json({ message: "You don't have access to this channel" });
      }

      // Fetch messages
      const messages = await Message.find({ channelId })
        .populate("sender")
        .sort({ createdAt: 1 });

      return res.status(200).json({
        message: "Messages retrieved successfully",
        data: messages,
      });
    } catch (error: any) {
      return res.status(500).json({
        message: "Error retrieving messages",
        error: error.message,
      });
    }
  })();
});

// Send a message
router.post("/", (req: Request, res: Response) => {
  const { text, channelId, attachments } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!channelId || !text) {
    return res
      .status(400)
      .json({ message: "Channel ID and message text are required" });
  }

  // Process with async/await in a self-executing function
  (async () => {
    try {
      // Check if user is a member of the channel
      const channel = await Channel.findById(channelId);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      const isMember = channel.members.some(
        (member) => member.userId.toString() === userId
      );

      if (!isMember) {
        return res
          .status(403)
          .json({ message: "You don't have access to this channel" });
      }

      // Create message
      const message = new Message({
        text,
        sender: userId,
        channelId,
        attachments: attachments || [],
      });

      await message.save();

      // Update channel's lastMessage
      channel.lastMessage = message._id;
      await channel.save();

      // Populate sender info for response
      await message.populate("sender");

      // Get the io instance from the request to emit the message
      if (req.app.get("io")) {
        req.app.get("io").to(channelId).emit("new_message", message);
      }

      return res.status(201).json({
        message: "Message sent successfully",
        data: message,
      });
    } catch (error: any) {
      return res.status(500).json({
        message: "Error sending message",
        error: error.message,
      });
    }
  })();
});

export default router;
