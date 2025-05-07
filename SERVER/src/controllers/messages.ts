import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { Message } from "../models/Message";
import { Channel } from "../models/Channel";
import mongoose from "mongoose";

// Define more specific types
interface MessageData {
  text: string;
  channelId: string;
  sender: string;
  replyTo?: string;
  attachments?: any[];
}

// Define a type for a message with attachments
interface MessageWithAttachments {
  id: string;
  attachments: any[];
  channelId: any;
  sender: any;
  replyTo?: any;
}

/**
 * Get messages for a channel
 * @route GET /api/messages/channel/:channelId
 * @access Private
 */
export const getMessagesForChannel = async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const since = req.query.since
      ? Number.parseInt(req.query.since as string)
      : 0;

    const query: any = { channelId };
    if (since > 0) {
      query.createdAt = { $gt: new Date(since) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: "asc" })
      .populate("user")
      .populate("attachments")
      .populate("reactions");

    // Transform to match your client format
    const formattedMessages = messages.map((message: any) => ({
      id: message.id || message._id,
      text: message.content || message.text,
      sender: {
        id: message.user.id || message.user._id,
        username: message.user.username,
        avatar: message.user.avatar,
      },
      timestamp: message.createdAt,
      channelId: message.channelId,
      attachments: message.attachments,
      reactions: message.reactions,
      isEdited: message.isEdited,
      replyTo: message.replyToId ? { id: message.replyToId } : null,
    }));

    // Wrap in the expected format with a data property
    res.json({
      success: true,
      data: formattedMessages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch messages",
        statusCode: 500,
        code: "MESSAGES_FETCH_ERROR",
      },
    });
  }
};

/**
 * Send a message
 * @route POST /api/messages
 * @access Private
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { channelId, content, attachments, replyToId } = req.body;
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

    // Check if the user is a member of the channel
    const isMember = await Channel.findOne({
      _id: channelId,
      "members.userId": userId,
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You are not a member of this channel",
          statusCode: 403,
          code: "NOT_CHANNEL_MEMBER",
        },
      });
    }

    // Create message
    const messageData: MessageData = {
      text: content,
      channelId,
      sender: userId,
      replyTo: replyToId,
    };

    if (attachments && attachments.length > 0) {
      messageData.attachments = attachments.map((attachment: any) => ({
        type: attachment.type,
        url: attachment.url,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        width: attachment.width,
        height: attachment.height,
        duration: attachment.duration,
      }));
    }

    const message = new Message(messageData);
    await message.save();

    // Populate message data for response
    await message.populate("user");
    await message.populate("attachments");
    await message.populate("reactions");

    if (replyToId) {
      await message.populate({
        path: "replyTo",
        populate: { path: "user" },
      });
    }

    // Update the channel's last message
    await Channel.findByIdAndUpdate(channelId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not send message",
        statusCode: 500,
        code: "MESSAGE_SEND_ERROR",
      },
    });
  }
};

/**
 * Update a message
 * @route PUT /api/messages/:id
 * @access Private
 */
export const updateMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
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

    // Check if the message exists and belongs to the user
    const message = await Message.findOne({
      _id: id,
      sender: userId,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Message not found or you are not the author",
          statusCode: 404,
          code: "MESSAGE_NOT_FOUND",
        },
      });
    }

    // Update the message
    const updatedMessage = await Message.findByIdAndUpdate(
      id,
      {
        text: content,
        isEdited: true,
        updatedAt: new Date(),
      },
      { new: true }
    )
      .populate("user")
      .populate("reactions")
      .populate("attachments");

    res.status(200).json({
      success: true,
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Update message error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not update message",
        statusCode: 500,
        code: "MESSAGE_UPDATE_ERROR",
      },
    });
  }
};

/**
 * Delete a message
 * @route DELETE /api/messages/:id
 * @access Private
 */
export const deleteMessage = async (req: Request, res: Response) => {
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

    // Get the message with its attachments
    const message = await Message.findById(id).populate("attachments");

    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Message not found",
          statusCode: 404,
          code: "MESSAGE_NOT_FOUND",
        },
      });
    }

    // Check if user is member or admin of the channel
    const channel = await Channel.findById(message.channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Channel not found",
          statusCode: 404,
          code: "CHANNEL_NOT_FOUND",
        },
      });
    }

    // Check if the user is a member with admin role
    const isAdmin = channel.members.some(
      (member: any) =>
        member.userId.toString() === userId && member.role === "admin"
    );

    // Check if the user is the author or an admin of the channel
    const isAuthor = message.sender.toString() === userId;

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You do not have permission to delete this message",
          statusCode: 403,
          code: "PERMISSION_DENIED",
        },
      });
    }

    // Check if this is the channel's last message
    if (channel.lastMessage && channel.lastMessage.toString() === id) {
      // Find the previous message to update the channel's lastMessageId
      const previousMessage = await Message.findOne({
        channelId: message.channelId,
        _id: { $ne: id },
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

    // Delete the message (this will cascade delete the attachments in the database due to onDelete: Cascade)
    await Message.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      data: {
        message: "Message deleted successfully",
      },
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not delete message",
        statusCode: 500,
        code: "MESSAGE_DELETE_ERROR",
      },
    });
  }
};

/**
 * Add a reaction to a message
 * @route POST /api/messages/:id/reactions
 * @access Private
 */
export const addReaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
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

    // Check if the message exists
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Message not found",
          statusCode: 404,
          code: "MESSAGE_NOT_FOUND",
        },
      });
    }

    // Check if the user is a member of the channel
    const channel = await Channel.findById(message.channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Channel not found",
          statusCode: 404,
          code: "CHANNEL_NOT_FOUND",
        },
      });
    }

    const isMember = channel.members.some(
      (member: any) => member.userId.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You are not a member of this channel",
          statusCode: 403,
          code: "NOT_CHANNEL_MEMBER",
        },
      });
    }

    // Check if reaction already exists
    let updatedMessage;
    const reactionExists =
      message.reactions &&
      message.reactions.some(
        (r: any) => r.emoji === emoji && r.users.includes(userId)
      );

    if (reactionExists) {
      // Remove user from the reaction
      updatedMessage = await Message.findByIdAndUpdate(
        id,
        {
          $pull: {
            "reactions.$[elem].users": userId,
          },
        },
        {
          arrayFilters: [{ "elem.emoji": emoji }],
          new: true,
        }
      );

      // Remove the reaction entirely if no users left
      updatedMessage = await Message.findByIdAndUpdate(
        id,
        {
          $pull: {
            reactions: {
              users: { $size: 0 },
            },
          },
        },
        { new: true }
      );
    } else {
      // Add reaction if it doesn't exist or add user to existing reaction
      const reaction =
        message.reactions &&
        message.reactions.find((r: any) => r.emoji === emoji);

      if (reaction) {
        // Add user to existing reaction
        updatedMessage = await Message.findByIdAndUpdate(
          id,
          {
            $addToSet: {
              "reactions.$[elem].users": userId,
            },
          },
          {
            arrayFilters: [{ "elem.emoji": emoji }],
            new: true,
          }
        );
      } else {
        // Create new reaction
        updatedMessage = await Message.findByIdAndUpdate(
          id,
          {
            $push: {
              reactions: {
                emoji,
                users: [userId],
              },
            },
          },
          { new: true }
        );
      }
    }

    // Return the updated reactions
    res.status(201).json({
      success: true,
      data: updatedMessage ? updatedMessage.reactions : [],
    });
  } catch (error) {
    console.error("Add reaction error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not add reaction",
        statusCode: 500,
        code: "REACTION_ADD_ERROR",
      },
    });
  }
};

/**
 * Remove a reaction from a message
 * @route DELETE /api/messages/:id/reactions/:emoji
 * @access Private
 */
export const removeReaction = async (req: Request, res: Response) => {
  try {
    const { id, emoji } = req.params;
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

    // Remove the user from the specified reaction
    await Message.findByIdAndUpdate(
      id,
      {
        $pull: {
          "reactions.$[elem].users": userId,
        },
      },
      {
        arrayFilters: [{ "elem.emoji": emoji }],
      }
    );

    // Remove the reaction entirely if no users left
    await Message.findByIdAndUpdate(id, {
      $pull: {
        reactions: {
          users: { $size: 0 },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        message: "Reaction removed successfully",
      },
    });
  } catch (error) {
    console.error("Remove reaction error:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Could not remove reaction",
        statusCode: 500,
        code: "REACTION_REMOVE_ERROR",
      },
    });
  }
};
