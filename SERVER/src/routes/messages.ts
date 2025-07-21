import express, { type Request, type Response } from "express";
import { protect } from "../middleware/auth";
import { Message } from "../models/Message";
import { Channel } from "../models/Channel";
import { upload } from "../middleware/upload"; // Import the upload middleware
import path from "path";
import fs from "fs";
import {
  createMessage,
  getMessages,
  updateMessage,
  deleteMessage,
  reactToMessage,
} from "../controllers/messages";

const router = express.Router();

// All routes in this router require authentication
router.use(protect as express.RequestHandler);

// Add a new route for uploading files with messages
router.post(
  "/upload",
  upload.array("files", 10),
  async (req: Request, res: Response) => {
    const { text, channelId, replyToId } = req.body;
    const userId = req.user?.id;
    const files = req.files as Express.Multer.File[];

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!channelId) {
      return res.status(400).json({ message: "Channel ID is required" });
    }

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

      // Process uploaded files
      const attachments = files.map((file) => ({
        type: file.mimetype.startsWith("image/")
          ? "image"
          : file.mimetype.startsWith("audio/")
          ? "audio"
          : "file",
        url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      }));

      // Create message with attachments
      const message = new Message({
        text: text || "",
        sender: userId,
        channelId,
        replyTo: replyToId,
        attachments,
      });

      await message.save();

      // Update channel's lastMessage
      await Channel.findByIdAndUpdate(channelId, {
        lastMessage: message._id,
        updatedAt: new Date(),
      });

      // Populate sender info for response
      await message.populate("sender");

      // Populate replyTo message if it exists
      if (message.replyTo) {
        await message.populate({
          path: "replyTo",
          populate: { path: "sender" },
        });
      }

      // Emit socket event if available
      if (req.app.get("io")) {
        req.app.get("io").to(channelId).emit("new_message", message);
      }

      return res.status(201).json({
        message: "Message with attachments sent successfully",
        data: message,
      });
    } catch (error: any) {
      console.error("Error sending message with attachments:", error);
      return res.status(500).json({
        message: "Error sending message with attachments",
        error: error.message,
      });
    }
  }
);

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
        .populate({
          path: "replyTo",
          populate: { path: "sender" },
        })
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
router.post("/", createMessage);

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

// --- ADD DELETE ROUTE FOR DELETING MESSAGE START ---
router.delete("/:messageId", async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Get the message with attachments
    const message = await Message.findById(messageId).populate("attachments");

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is member or admin of the channel
    const channel = await Channel.findById(message.channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    // Check if the user is a member with admin role
    const isAdmin = channel.members.some(
      (member) =>
        member &&
        member.userId &&
        member.userId.toString() === userId &&
        member.role === "admin"
    );

    // Check if the user is the author or an admin of the channel
    const isAuthor = message.sender.toString() === userId;

    if (!isAuthor && !isAdmin) {
      return res
        .status(403)
        .json({ message: "You don't have permission to delete this message" });
    }

    // Check if this is the channel's last message
    if (channel.lastMessage && channel.lastMessage.toString() === messageId) {
      // Find the previous message to update the channel's lastMessageId
      const previousMessage = await Message.findOne({
        channelId: message.channelId,
        _id: { $ne: messageId },
      }).sort({ createdAt: -1 });

      // Update the channel's lastMessageId
      await Channel.findByIdAndUpdate(message.channelId, {
        lastMessage: previousMessage?._id || null,
      });
    }

    // Delete attachment files from the server
    if (message.attachments && message.attachments.length > 0) {
      const uploadDir = path.join(__dirname, "../../uploads"); // Path to uploads directory

      for (const attachment of message.attachments) {
        try {
          // Extract the filename from the URL
          const fileUrl = new URL(attachment.url);
          const pathname = fileUrl.pathname;
          const filename = pathname.split("/").pop(); // Get just the filename

          if (filename) {
            const filePath = path.join(uploadDir, filename);

            // Check if file exists before attempting to delete
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`Deleted file: ${filePath}`);
            } else {
              console.warn(`File not found: ${filePath}`);
            }
          }
        } catch (error) {
          console.error(
            `Error deleting attachment file: ${attachment.url}`,
            error
          );
          // Continue with deletion even if some files fail to be deleted
        }
      }
    }

    // Delete the message
    await Message.findByIdAndDelete(messageId);

    // Emit event if WebSocket is available
    if (req.app.get("io")) {
      req.app
        .get("io")
        .to(message.channelId.toString())
        .emit("message_deleted", {
          messageId,
          channelId: message.channelId,
        });
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete message error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting message",
      error: error.message,
    });
  }
});
// --- ADD DELETE ROUTE FOR DELETING MESSAGE END ---

// --- ADD POST ROUTE FOR ADDING/TOGGLING REACTION START ---
router.post("/:messageId/reactions", async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { emoji } = req.body; // Expecting emoji in the request body
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!emoji) {
    return res.status(400).json({ message: "Emoji is required" });
  }

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

    if (reactionIndex > -1) {
      // Reaction emoji exists
      const userIndex = message.reactions[reactionIndex].users.findIndex(
        (userReactedId) => userReactedId.toString() === userId
      );

      if (userIndex > -1) {
        // User has reacted with this emoji, remove the reaction (toggle off)
        message.reactions[reactionIndex].users.splice(userIndex, 1);
        // If no users left for this emoji, remove the emoji reaction entirely
        if (message.reactions[reactionIndex].users.length === 0) {
          message.reactions.splice(reactionIndex, 1);
        }
      } else {
        // User has not reacted with this emoji, add user to the list
        message.reactions[reactionIndex].users.push(userId as any);
      }
    } else {
      // Reaction emoji does not exist, add new reaction
      message.reactions.push({ emoji, users: [userId as any] });
    }

    // Update the message document
    message.updatedAt = new Date();
    await message.save();

    // Populate sender for the response/event
    await message.populate("sender");
    // Populate reaction users if needed (optional, can increase payload size)
    // await message.populate("reactions.users");

    // Emit update event via WebSocket
    if (req.app.get("io")) {
      req.app
        .get("io")
        .to(message.channelId.toString())
        // Use message_updated, assuming client handles this for general updates
        .emit("message_updated", message);
    }

    return res.status(200).json({
      message: "Reaction updated successfully",
      data: message.reactions, // Send back updated reactions or the whole message
    });
  } catch (error: any) {
    console.error("Update reaction error:", error);
    return res.status(500).json({
      message: "Error updating reaction",
      error: error.message,
    });
  }
});
// --- ADD POST ROUTE FOR ADDING/TOGGLING REACTION END ---

export default router;
