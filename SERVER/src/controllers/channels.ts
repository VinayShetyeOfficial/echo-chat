import type { Request, Response } from "express"
import { prisma } from "../index"

/**
 * Create a new channel
 * @route POST /api/channels
 * @access Private
 */
export const createChannel = async (req: Request, res: Response) => {
  try {
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

    const { name, description, type, isPrivate, memberIds } = req.body

    // Validate channel type
    if (type !== "direct" && type !== "group") {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Channel type must be either "direct" or "group"',
          statusCode: 400,
          code: "INVALID_CHANNEL_TYPE",
        },
      })
    }

    /**
     * If it's a direct channel, ensure at least one recipient is provided.
     * (Originally, it enforced exactly one. If your UI sends exactly 1 user ID for the recipient,
     *  that works best. But if you need to invite more in future, relax the check.
     *  For a typical one-on-one direct chat, pass exactly one user ID.)
     */
    if (type === "direct" && (!Array.isArray(memberIds) || memberIds.length < 1)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Direct channels must have at least one recipient (pass exactly 1 ID for typical direct chat).",
          statusCode: 400,
          code: "INVALID_MEMBERS_COUNT",
        },
      })
    }

    // Check if direct channel already exists with these two users
    if (type === "direct") {
      // If exactly one recipient is provided, we can check for an existing channel with the same 2 members
      // This is optional — you can skip if your design allows multiple direct channels with the same user pair
      if (memberIds.length === 1) {
        const existingChannel = await prisma.channel.findFirst({
          where: {
            type: "direct",
            members: {
              every: {
                userId: {
                  in: [userId, ...memberIds],
                },
              },
            },
            AND: {
              members: {
                some: {
                  userId,
                },
              },
            },
          },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true,
                    isOnline: true,
                    lastSeen: true,
                  },
                },
              },
            },
            lastMessage: true,
          },
        })

        if (existingChannel) {
          // Return the existing channel if found
          return res.status(200).json({
            success: true,
            data: existingChannel,
          })
        }
      }
    }

    // Create the channel
    const channel = await prisma.channel.create({
      data: {
        name:
          type === "direct" && memberIds.length === 1
            ? (await prisma.user.findUnique({ where: { id: memberIds[0] } }))?.username || ""
            : name || "",
        description,
        type,
        isPrivate: isPrivate || false,
        members: {
          create: [
            // Add the creator as admin
            {
              userId,
              role: "admin",
            },
            // Add other members
            ...memberIds.map((id: string) => ({
              userId: id,
              role: "member",
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    })

    res.status(201).json({
      success: true,
      data: channel,
    })
  } catch (error) {
    console.error("Create channel error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not create channel",
        statusCode: 500,
        code: "CHANNEL_CREATE_ERROR",
      },
    })
  }
}

/**
 * Get all channels for the authenticated user
 * @route GET /api/channels
 * @access Private
 */
export const getChannels = async (req: Request, res: Response) => {
  try {
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

    const channels = await prisma.channel.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        lastMessage: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    res.status(200).json({
      success: true,
      data: channels,
    })
  } catch (error) {
    console.error("Get channels error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not get channels",
        statusCode: 500,
        code: "CHANNELS_ERROR",
      },
    })
  }
}

/**
 * Get a channel by ID
 * @route GET /api/channels/:id
 * @access Private
 */
export const getChannelById = async (req: Request, res: Response) => {
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

    // Check if the user is a member of the channel
    const channel = await prisma.channel.findFirst({
      where: {
        id,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        lastMessage: true,
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 30,
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
        },
      },
    })

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Channel not found or you are not a member",
          statusCode: 404,
          code: "CHANNEL_NOT_FOUND",
        },
      })
    }

    res.status(200).json({
      success: true,
      data: channel,
    })
  } catch (error) {
    console.error("Get channel error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not get channel",
        statusCode: 500,
        code: "CHANNEL_ERROR",
      },
    })
  }
}

/**
 * Update a channel
 * @route PUT /api/channels/:id
 * @access Private
 */
export const updateChannel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.id
    const { name, description, isPrivate } = req.body

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

    // Check if the user is an admin of the channel
    const userMembership = await prisma.channelMember.findFirst({
      where: {
        channelId: id,
        userId,
        role: "admin",
      },
    })

    if (!userMembership) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You do not have permission to update this channel",
          statusCode: 403,
          code: "PERMISSION_DENIED",
        },
      })
    }

    // Update the channel
    const updatedChannel = await prisma.channel.update({
      where: { id },
      data: {
        name,
        description,
        isPrivate,
        updatedAt: new Date(),
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        lastMessage: true,
      },
    })

    res.status(200).json({
      success: true,
      data: updatedChannel,
    })
  } catch (error) {
    console.error("Update channel error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not update channel",
        statusCode: 500,
        code: "CHANNEL_UPDATE_ERROR",
      },
    })
  }
}

/**
 * Delete a channel
 * @route DELETE /api/channels/:id
 * @access Private
 */
export const deleteChannel = async (req: Request, res: Response) => {
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

    // Check if the user is an admin of the channel
    const userMembership = await prisma.channelMember.findFirst({
      where: {
        channelId: id,
        userId,
        role: "admin",
      },
    })

    if (!userMembership) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You do not have permission to delete this channel",
          statusCode: 403,
          code: "PERMISSION_DENIED",
        },
      })
    }

    // Check if it's a direct channel
    const channel = await prisma.channel.findUnique({
      where: { id },
    })

    if (channel?.type === "direct") {
      return res.status(400).json({
        success: false,
        error: {
          message: "Direct channels cannot be deleted",
          statusCode: 400,
          code: "INVALID_OPERATION",
        },
      })
    }

    // Delete the channel
    await prisma.channel.delete({
      where: { id },
    })

    res.status(200).json({
      success: true,
      data: {
        message: "Channel deleted successfully",
      },
    })
  } catch (error) {
    console.error("Delete channel error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not delete channel",
        statusCode: 500,
        code: "CHANNEL_DELETE_ERROR",
      },
    })
  }
}

/**
 * Add a member to a channel
 * @route POST /api/channels/:id/members
 * @access Private
 */
export const addChannelMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { userId: memberToAddId, role = "member" } = req.body
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

    // Check if the user is an admin of the channel
    const userMembership = await prisma.channelMember.findFirst({
      where: {
        channelId: id,
        userId,
        role: "admin",
      },
    })

    if (!userMembership) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You do not have permission to add members to this channel",
          statusCode: 403,
          code: "PERMISSION_DENIED",
        },
      })
    }

    // Check if the channel is direct
    const channel = await prisma.channel.findUnique({
      where: { id },
    })

    if (channel?.type === "direct") {
      return res.status(400).json({
        success: false,
        error: {
          message: "Cannot add members to direct channels",
          statusCode: 400,
          code: "INVALID_OPERATION",
        },
      })
    }

    // Check if the member is already in the channel
    const existingMembership = await prisma.channelMember.findFirst({
      where: {
        channelId: id,
        userId: memberToAddId,
      },
    })

    if (existingMembership) {
      return res.status(400).json({
        success: false,
        error: {
          message: "User is already a member of this channel",
          statusCode: 400,
          code: "MEMBER_EXISTS",
        },
      })
    }

    // Add the member
    const newMember = await prisma.channelMember.create({
      data: {
        channelId: id,
        userId: memberToAddId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
            lastSeen: true,
          },
        },
      },
    })

    res.status(201).json({
      success: true,
      data: newMember,
    })
  } catch (error) {
    console.error("Add channel member error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not add member to channel",
        statusCode: 500,
        code: "ADD_MEMBER_ERROR",
      },
    })
  }
}

/**
 * Remove a member from a channel
 * @route DELETE /api/channels/:id/members/:userId
 * @access Private
 */
export const removeChannelMember = async (req: Request, res: Response) => {
  try {
    const { id, userId: memberToRemoveId } = req.params
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

    // Check if the user is an admin of the channel or is removing themselves
    const userMembership = await prisma.channelMember.findFirst({
      where: {
        channelId: id,
        userId,
        OR: [
          { role: "admin" },
          { userId: memberToRemoveId }, // User can remove themselves
        ],
      },
    })

    if (!userMembership) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You do not have permission to remove this member",
          statusCode: 403,
          code: "PERMISSION_DENIED",
        },
      })
    }

    // Check if the channel is direct
    const channel = await prisma.channel.findUnique({
      where: { id },
    })

    if (channel?.type === "direct") {
      return res.status(400).json({
        success: false,
        error: {
          message: "Cannot remove members from direct channels",
          statusCode: 400,
          code: "INVALID_OPERATION",
        },
      })
    }

    // Remove the member
    await prisma.channelMember.deleteMany({
      where: {
        channelId: id,
        userId: memberToRemoveId,
      },
    })

    res.status(200).json({
      success: true,
      data: {
        message: "Member removed successfully",
      },
    })
  } catch (error) {
    console.error("Remove channel member error:", error)
    res.status(500).json({
      success: false,
      error: {
        message: "Could not remove member from channel",
        statusCode: 500,
        code: "REMOVE_MEMBER_ERROR",
      },
    })
  }
}
