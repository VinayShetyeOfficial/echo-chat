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
        (member) =>
          member && member.userId && member.userId.toString() === userId
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
        (member) =>
          member && member.userId && member.userId.toString() === userId
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

      // Update channel's lastMessage using findByIdAndUpdate
      await Channel.findByIdAndUpdate(channelId, {
        lastMessage: message._id,
        // Optionally update the channel's updatedAt timestamp as well
        updatedAt: new Date(),
      });

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

// --- TEST GET ROUTE FOR /:messageId START ---
/*
router.get("/:messageId", protect, async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user?.id;
  console.log(`GET /api/messages/${messageId} accessed by user ${userId}`);
  try {
    // Optional: Fetch the message to ensure ID is valid, but keep it simple for now
    // const message = await Message.findById(messageId);
    // if (!message) return res.status(404).json({ message: "Test: Message not found" });

    res
      .status(200)
      .json({ message: `Test GET route for message ${messageId} OK` });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Test GET route error", error: error.message });
  }
});
*/
// --- TEST GET ROUTE FOR /:messageId END ---

// --- ADD PUT ROUTE FOR UPDATING MESSAGE START ---
router.put("/:messageId", protect, async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { text } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!text) {
    return res.status(400).json({ message: "Message text cannot be empty" });
  }

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if the user is the sender of the message
    if (message.sender.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You can only edit your own messages" });
    }

    // Update the message
    message.text = text;
    message.isEdited = true;
    message.updatedAt = new Date();

    await message.save();

    // Populate sender info for the response
    await message.populate("sender");

    // Emit update event via WebSocket (optional, depends on your real-time needs)
    if (req.app.get("io")) {
      req.app
        .get("io")
        .to(message.channelId.toString())
        .emit("message_updated", message);
    }

    return res.status(200).json({
      message: "Message updated successfully",
      data: message,
    });
  } catch (error: any) {
    console.error("Update message error:", error);
    return res.status(500).json({
      message: "Error updating message",
      error: error.message,
    });
  }
});
// --- ADD PUT ROUTE FOR UPDATING MESSAGE END ---

export default router;
