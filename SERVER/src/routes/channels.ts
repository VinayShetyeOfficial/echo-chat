import express, { type Request, type Response } from "express"
import { addChannelMember, removeChannelMember } from "../controllers/channels"
import { protect } from "../middleware/auth"
import { createHandler } from "../utils/routeHandler"
import { Channel } from "../models/Channel"
import { Message } from "../models/Message"

const router = express.Router()

// Use middleware to protect all routes in this router
router.use(protect)

// Channel routes
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, type, isPrivate, memberIds } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    // Validate memberIds to ensure they're all valid strings
    const validMemberIds = Array.isArray(memberIds) ? memberIds.filter((id) => id && typeof id === "string") : []

    // Log warning if any member IDs were filtered out
    if (Array.isArray(memberIds) && validMemberIds.length !== memberIds.length) {
      console.warn(
        `Some member IDs were invalid and filtered out. Original: ${memberIds.length}, Valid: ${validMemberIds.length}`,
      )
    }

    // Create channel members array with the creator as admin
    const members = [
      { userId, role: "admin" },
      ...validMemberIds.map((id: string) => ({
        userId: id,
        role: "member",
      })),
    ]

    // Create new channel
    const channel = new Channel({
      name,
      description,
      type: type || "group",
      isPrivate: isPrivate || false,
      members,
      createdBy: userId,
    })

    await channel.save()

    // Populate members
    await channel.populate("members.userId")

    return res.status(201).json({
      message: "Channel created successfully",
      data: channel,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Error creating channel",
      error: error.message,
    })
  }
})

// Get all channels for the current user
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    // 1. Find channels, populate members, get plain objects
    const channelsData = await Channel.find({
      "members.userId": userId,
    })
      .populate("members.userId")
      .lean() // Use lean()

    // 2. Extract lastMessage IDs
    const messageIds = channelsData.map((ch) => ch.lastMessage).filter((id) => id) // Filter out null/undefined IDs

    // 3. Fetch and populate the relevant last messages separately
    const lastMessages = await Message.find({ _id: { $in: messageIds } })
      .populate("sender") // Populate sender for these messages
      .lean() // Use lean()

    // 4. Create a map for quick lookup
    const lastMessageMap = new Map(lastMessages.map((msg) => [msg._id.toString(), msg]))

    // 5. Attach the populated lastMessage back to each channel
    const finalChannels = channelsData.map((channel) => {
      // Ensure lastMessage is an object ID before converting to string
      const lastMsgId = channel.lastMessage ? channel.lastMessage.toString() : null
      const populatedLastMessage = lastMsgId ? lastMessageMap.get(lastMsgId) || null : null
      return {
        ...channel,
        // Convert mongoose docs back if needed, or adjust client handling
        lastMessage: populatedLastMessage,
      }
    })

    // --- DEBUG: Log final channels ---
    console.log("[GET /channels] Final channels data (manual populate):", JSON.stringify(finalChannels, null, 2))
    // --- END DEBUG ---

    return res.status(200).json({
      message: "Channels retrieved successfully",
      data: finalChannels, // Send the manually processed data
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Error retrieving channels",
      error: error.message,
    })
  }
})

// Get a specific channel by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    // Find the channel
    const channel = await Channel.findById(id)
      .populate("members.userId")
      .populate({
        path: "lastMessage",
        populate: { path: "sender" },
      })

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" })
    }

    // Check if user is a member of the channel
    const isMember = channel.members.some((member) => member.userId && member.userId.toString() === userId)

    if (!isMember) {
      return res.status(403).json({ message: "You don't have access to this channel" })
    }

    return res.status(200).json({
      message: "Channel retrieved successfully",
      data: channel,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Error retrieving channel",
      error: error.message,
    })
  }
})

// Update a channel
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, description, isPrivate } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    // Find the channel
    const channel = await Channel.findById(id)
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" })
    }

    // Check if user is an admin of the channel
    const isAdmin = channel.members.some(
      (member) => member.userId && member.userId.toString() === userId && member.role === "admin",
    )

    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can update channels" })
    }

    // Update the channel
    const updatedChannel = await Channel.findByIdAndUpdate(
      id,
      { name, description, isPrivate },
      { new: true },
    ).populate("members.userId")

    return res.status(200).json({
      message: "Channel updated successfully",
      data: updatedChannel,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Error updating channel",
      error: error.message,
    })
  }
})

// Delete a channel
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    // Find the channel
    const channel = await Channel.findById(id)
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" })
    }

    // Check if user is an admin of the channel
    const isAdmin = channel.members.some(
      (member) => member.userId && member.userId.toString() === userId && member.role === "admin",
    )

    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can delete channels" })
    }

    // Delete the channel
    await Channel.findByIdAndDelete(id)

    return res.status(200).json({
      message: "Channel deleted successfully",
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Error deleting channel",
      error: error.message,
    })
  }
})

// Channel members
router.post("/:id/members", createHandler(addChannelMember))
router.delete("/:id/members/:userId", createHandler(removeChannelMember))

export default router
