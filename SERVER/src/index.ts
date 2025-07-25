import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import path from "path";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import channelRoutes from "./routes/channels";
import messageRoutes from "./routes/messages";
import { authMiddleware } from "./middleware/auth";
import invitationRoutes from "./routes/invitations";
import { redisClient } from "./config/redis";
import { ConnectionCache } from "./services/connectionCache";
import { SocketManager } from "./services/socketManager";

// Initialize environment variables
dotenv.config();

// Create Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with enhanced manager
const socketManager = new SocketManager(httpServer);

// Make io accessible to routes
app.set("io", socketManager.getIO());

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

// Serve static files from the uploads directory
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes); // Make sure this is registered
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

// Add Redis test routes
app.get("/api/test/redis-set", async (req, res) => {
  try {
    await redisClient.set("test-key", "hello-redis");
    console.log("[Redis] Set test-key = hello-redis");
    res.json({ message: "Redis SET successful" });
  } catch (err) {
    console.error("[Redis] SET error:", err);
    res.status(500).json({ error: "Redis SET failed" });
  }
});

app.get("/api/test/redis-get", async (req, res) => {
  try {
    const value = await redisClient.get("test-key");
    console.log("[Redis] Get test-key =", value);
    res.json({ message: "Redis GET successful", value });
  } catch (err) {
    console.error("[Redis] GET error:", err);
    res.status(500).json({ error: "Redis GET failed" });
  }
});

// Add ConnectionCache test routes
app.get("/api/test/connection-store", async (req, res) => {
  try {
    const userId = "test-user-123";
    const socketId = "socket-456";
    const serverId = "server-789";

    await ConnectionCache.storeUserConnection(userId, socketId, serverId);
    console.log("[ConnectionCache] Test: Stored user connection");
    res.json({ message: "Connection stored successfully" });
  } catch (err) {
    console.error("[ConnectionCache] Test error:", err);
    res.status(500).json({ error: "Connection store failed" });
  }
});

app.get("/api/test/connection-get", async (req, res) => {
  try {
    const userId = "test-user-123";
    const connection = await ConnectionCache.getUserConnection(userId);
    const isOnline = await ConnectionCache.isUserOnline(userId);

    console.log("[ConnectionCache] Test: Retrieved connection:", connection);
    console.log("[ConnectionCache] Test: User online status:", isOnline);

    res.json({
      message: "Connection retrieved successfully",
      connection,
      isOnline,
    });
  } catch (err) {
    console.error("[ConnectionCache] Test error:", err);
    res.status(500).json({ error: "Connection get failed" });
  }
});

app.get("/api/test/connection-remove", async (req, res) => {
  try {
    const userId = "test-user-123";
    await ConnectionCache.removeUserConnection(userId);
    console.log("[ConnectionCache] Test: Removed user connection");
    res.json({ message: "Connection removed successfully" });
  } catch (err) {
    console.error("[ConnectionCache] Test error:", err);
    res.status(500).json({ error: "Connection remove failed" });
  }
});

app.get("/api/test/connection-online", async (req, res) => {
  try {
    const onlineUsers = await ConnectionCache.getOnlineUsers();
    console.log("[ConnectionCache] Test: Online users:", onlineUsers);
    res.json({
      message: "Online users retrieved successfully",
      onlineUsers,
    });
  } catch (err) {
    console.error("[ConnectionCache] Test error:", err);
    res.status(500).json({ error: "Online users get failed" });
  }
});

// Add SocketManager test routes
app.get("/api/test/socket-info", (req, res) => {
  try {
    const connectedUsers = socketManager.getConnectedUsers();
    const serverId = socketManager.getServerId();

    console.log("[SocketManager] Test: Server info requested");
    res.json({
      message: "Socket manager info retrieved successfully",
      serverId,
      connectedUsers,
      totalConnected: connectedUsers.length,
    });
  } catch (err) {
    console.error("[SocketManager] Test error:", err);
    res.status(500).json({ error: "Socket info failed" });
  }
});

app.get("/api/test/socket-users", (req, res) => {
  try {
    const connectedUsers = socketManager.getConnectedUsers();
    const onlineUsers = connectedUsers.map((user) => ({
      userId: user.userId,
      username: user.username,
      socketId: user.socketId,
    }));

    console.log("[SocketManager] Test: Connected users:", onlineUsers);
    res.json({
      message: "Connected users retrieved successfully",
      users: onlineUsers,
      count: onlineUsers.length,
    });
  } catch (err) {
    console.error("[SocketManager] Test error:", err);
    res.status(500).json({ error: "Users get failed" });
  }
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
