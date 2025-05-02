import type { Request, Response } from "express"
import { prisma } from "../index"

/**
 * Get messages for a channel
 * @route GET /api/messages/channel/:channelId
 * @access Private
 */
export const getMessagesForChannel = async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params
    const since = req.query.since ? Number.parseInt(req.query.since as string) : 0

    const query = prisma.message.findMany({
      where: {
        channelId,
        ...(since > 0
          ? {
              createdAt: {
                gt: new Date(since),
              },
            }
          : {}),
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        user: true,
        attachments: true,
        reactions: true,
      },
    })

    const messages = await query

    // Transform to match your client format
    const formattedMessages = messages.map((message) => ({
      id: message.id,
      text: message.content,
      sender: {
        id: message.user.id,
        username: message.user.username,
        avatar: message.user.avatar,
      },
      timestamp: message.createdAt,
      channelId: message.channelId,
      attachments: message.attachments,
      reactions: message.reactions,
      isEdited: message.isEdited,
      replyTo: message.replyToId ? { id: message.replyToId } : null,
    }))

    // Wrap in the expected format with a data property
    res.json({
      success: true,
      data: formattedMessages,
    })
  } catch (error) {
    console.error("Error fetching messages:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch messages",
        statusCode: 500,
        code: "MESSAGES_FETCH_ERROR",
      },
    })
  }
}

/**
 * Send a message
 * @route POST /api/messages
 * @access Private
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { channelId, content, attachments, replyToId } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated",
          statusCode: 401,
          code: "NOT_AUTHENTICATED",
        },
      })
    }

    // Check if the user is a member of the channel
    const isMember = await prisma.channelMember.findFirst({
      where: {
        channelId,
        userId,
      },
    })

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You are not a member of this channel",
          statusCode: 403,
          code: "NOT_CHANNEL_MEMBER",
        },
      })
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        channelId,
        userId,
        replyToId,
        attachments: attachments
          ? {
              createMany: {
                data: attachments.map((attachment: any) => ({
                  type: attachment.type,
                  url: attachment.url,
                  fileName: attachment.fileName,
                  fileSize: attachment.fileSize,
                  mimeType: attachment.mimeType,
                  width: attachment.width,
                  height: attachment.height,
                  duration: attachment.duration,
                })),
              },
            }
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        reactions: true,
        attachments: true,
        replyTo: {
          select: {
            id: true,
            content: true,
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    })

    // Update the channel's last message
    await prisma.channel.update({
      where: { id: channelId },
      data: {
        lastMessageId: message.id,
        updatedAt: new Date(),
      },
    })

    res.status(201).json({
      success: true,
      data: message,
    })
  } catch (error) {
    console.error("Send message error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not send message",
        statusCode: 500,
        code: "MESSAGE_SEND_ERROR",
      },
    })
  }
}

/**
 * Update a message
 * @route PUT /api/messages/:id
 * @access Private
 */
export const updateMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { content } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated",
          statusCode: 401,
          code: "NOT_AUTHENTICATED",
        },
      })
    }

    // Check if the message exists and belongs to the user
    const message = await prisma.message.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Message not found or you are not the author",
          statusCode: 404,
          code: "MESSAGE_NOT_FOUND",
        },
      })
    }

    // Update the message
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        content,
        isEdited: true,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        attachments: true,
      },
    })

    res.status(200).json({
      success: true,
      data: updatedMessage,
    })
  } catch (error) {
    console.error("Update message error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not update message",
        statusCode: 500,
        code: "MESSAGE_UPDATE_ERROR",
      },
    })
  }
}

/**
 * Delete a message
 * @route DELETE /api/messages/:id
 * @access Private
 */
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated",
          statusCode: 401,
          code: "NOT_AUTHENTICATED",
        },
      })
    }

    // Get the message
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        channel: {
          include: {
            members: {
              where: {
                userId,
                role: "admin",
              },
            },
          },
        },
      },
    })

    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Message not found",
          statusCode: 404,
          code: "MESSAGE_NOT_FOUND",
        },
      })
    }

    // Check if the user is the author or an admin of the channel
    const isAuthor = message.userId === userId
    const isAdmin = message.channel.members.length > 0

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You do not have permission to delete this message",
          statusCode: 403,
          code: "PERMISSION_DENIED",
        },
      })
    }

    // Check if this is the channel's last message
    if (message.channel.lastMessageId === id) {
      // Find the previous message to update the channel's lastMessageId
      const previousMessage = await prisma.message.findFirst({
        where: {
          channelId: message.channelId,
          id: {
            not: id,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      // Update the channel's lastMessageId
      await prisma.channel.update({
        where: { id: message.channelId },
        data: {
          lastMessageId: previousMessage?.id || null,
        },
      })
    }

    // Delete the message
    await prisma.message.delete({
      where: { id },
    })

    res.status(200).json({
      success: true,
      data: {
        message: "Message deleted successfully",
      },
    })
  } catch (error) {
    console.error("Delete message error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not delete message",
        statusCode: 500,
        code: "MESSAGE_DELETE_ERROR",
      },
    })
  }
}

/**
 * Add a reaction to a message
 * @route POST /api/messages/:id/reactions
 * @access Private
 */
export const addReaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { emoji } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated",
          statusCode: 401,
          code: "NOT_AUTHENTICATED",
        },
      })
    }

    // Check if the message exists
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        channel: {
          include: {
            members: {
              where: {
                userId,
              },
            },
          },
        },
      },
    })

    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Message not found",
          statusCode: 404,
          code: "MESSAGE_NOT_FOUND",
        },
      })
    }

    // Check if the user is a member of the channel
    if (message.channel.members.length === 0) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You are not a member of this channel",
          statusCode: 403,
          code: "NOT_CHANNEL_MEMBER",
        },
      })
    }

    // Create the reaction if it doesn't exist
    const reaction = await prisma.reaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId: id,
          userId,
          emoji,
        },
      },
      update: {},
      create: {
        messageId: id,
        userId,
        emoji,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    res.status(201).json({
      success: true,
      data: reaction,
    })
  } catch (error) {
    console.error("Add reaction error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not add reaction",
        statusCode: 500,
        code: "REACTION_ADD_ERROR",
      },
    })
  }
}

/**
 * Remove a reaction from a message
 * @route DELETE /api/messages/:id/reactions/:emoji
 * @access Private
 */
export const removeReaction = async (req: Request, res: Response) => {
  try {
    const { id, emoji } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated",
          statusCode: 401,
          code: "NOT_AUTHENTICATED",
        },
      })
    }

    // Delete the reaction
    await prisma.reaction.deleteMany({
      where: {
        messageId: id,
        userId,
        emoji,
      },
    })

    res.status(200).json({
      success: true,
      data: {
        message: "Reaction removed successfully",
      },
    })
  } catch (error) {
    console.error("Remove reaction error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not remove reaction",
        statusCode: 500,
        code: "REACTION_REMOVE_ERROR",
      },
    })
  }
}
