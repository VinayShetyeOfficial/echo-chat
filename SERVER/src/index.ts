import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import authRoutes from "./routes/auth";
import channelRoutes from "./routes/channels";
import messageRoutes from "./routes/messages";
import { authMiddleware } from "./middleware/auth";
import invitationRoutes from "./routes/invitations";

// Initialize environment variables
dotenv.config();

// Create Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io accessible to routes
app.set("io", io);

// Middleware
app.use(
  cors({
    origin: "*", // Allow all origins in development
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/channels", authMiddleware, channelRoutes);
app.use("/api/messages", authMiddleware, messageRoutes);
app.use("/api/invitations", invitationRoutes);

// Basic test route
app.get("/", (_req, res) => {
  res.json({ message: "Echo Social Flow API Server" });
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Socket.IO setup
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Authenticate socket connection
  const token = socket.handshake.auth.token;
  if (!token) {
    socket.disconnect();
    return;
  }

  // Join a channel
  socket.on("join_channel", ({ channelId }) => {
    console.log(`User ${socket.id} joined channel ${channelId}`);
    socket.join(channelId);
  });

  // Leave a channel
  socket.on("leave_channel", ({ channelId }) => {
    console.log(`User ${socket.id} left channel ${channelId}`);
    socket.leave(channelId);
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Add this after your existing routes
app.post("/api/test/user", async (req, res) => {
  try {
    const { User } = require("./models/User");

    // Create a test user
    const testUser = new User({
      username: "testuser1",
      email: "test1@example.com",
      password: "password123",
      bio: "Test user bio",
    });

    // Save the user
    const savedUser = await testUser.save();

    // Fetch the user back
    const users = await User.find();

    res.json({
      message: "Test successful",
      savedUser,
      allUsers: users,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Test failed",
      error: error.message,
    });
  }
});

// Add this after your existing routes
app.post("/api/test/channel", async (req, res) => {
  try {
    const { Channel } = require("./models/Channel");
    const { User } = require("./models/User");

    // Get first user from database to use as member
    const testUser = await User.findOne();

    if (!testUser) {
      throw new Error("No test user found");
    }

    // Create a test channel
    const testChannel = new Channel({
      name: "general",
      description: "General discussion channel",
      type: "group",
      isPrivate: false,
      members: [
        {
          userId: testUser._id,
          role: "admin",
        },
      ],
    });

    // Save the channel
    const savedChannel = await testChannel.save();

    // Fetch the channel back with populated members
    const channels = await Channel.find().populate("members.userId");

    res.json({
      message: "Test successful",
      savedChannel,
      allChannels: channels,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Test failed",
      error: error.message,
    });
  }
});

// Add this after your existing routes
app.post("/api/test/message", async (req, res) => {
  try {
    const { Message } = require("./models/Message");
    const { User } = require("./models/User");
    const { Channel } = require("./models/Channel");

    // Get first user and channel from database
    const testUser = await User.findOne();
    const testChannel = await Channel.findOne();

    if (!testUser || !testChannel) {
      throw new Error("Test user or channel not found");
    }

    // Create a test message
    const testMessage = new Message({
      text: "Hello from MongoDB!",
      sender: testUser._id,
      channelId: testChannel._id,
      attachments: [
        {
          type: "image",
          url: "https://example.com/test.jpg",
          fileName: "test.jpg",
          fileSize: 1024,
          mimeType: "image/jpeg",
          width: 800,
          height: 600,
        },
      ],
      reactions: [
        {
          emoji: "👍",
          users: [testUser._id],
        },
      ],
    });

    // Save the message
    const savedMessage = await testMessage.save();

    // Update channel's lastMessage
    await Channel.findByIdAndUpdate(testChannel._id, {
      lastMessage: savedMessage._id,
    });

    // Fetch the message back with populated fields
    const messages = await Message.find()
      .populate("sender")
      .populate("channelId")
      .populate("reactions.users");

    res.json({
      message: "Test successful",
      savedMessage,
      allMessages: messages,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Test failed",
      error: error.message,
    });
  }
});

// Add a simple debug route with no middleware or database access
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// Add a debug endpoint to check server connectivity that also logs
app.get("/api/debug", (req, res) => {
  console.log("Debug endpoint was accessed");
  res.status(200).json({
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongoConnected: mongoose.connection.readyState === 1,
  });
});

// Start server
const PORT = process.env.PORT || 3001;
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log("Connected to MongoDB");
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });
