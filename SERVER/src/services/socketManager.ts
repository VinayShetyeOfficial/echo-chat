import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { ConnectionCache } from "./connectionCache";
import { User } from "../models/User";

interface AuthenticatedSocket {
  userId: string;
  username: string;
  socketId: string;
}

export class SocketManager {
  private io: SocketIOServer;
  private serverId: string;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();

  constructor(server: HTTPServer) {
    this.serverId = `server-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(",") || [
          "http://localhost:5173",
        ],
        methods: ["GET", "POST"],
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    console.log(`[SocketManager] Initialized with server ID: ${this.serverId}`);
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          console.log("[SocketManager] No token provided, disconnecting");
          return next(new Error("Authentication token required"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await User.findById(decoded.userId);

        if (!user) {
          console.log("[SocketManager] User not found, disconnecting");
          return next(new Error("User not found"));
        }

        // Attach user info to socket
        socket.data.user = {
          userId: user._id.toString(),
          username: user.username,
          socketId: socket.id,
        };

        console.log(
          `[SocketManager] User authenticated: ${user.username} (${user._id})`
        );
        next();
      } catch (error) {
        console.error("[SocketManager] Authentication error:", error);
        next(new Error("Authentication failed"));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on("connection", async (socket) => {
      const user = socket.data.user as AuthenticatedSocket;

      try {
        // Store connection in cache
        await ConnectionCache.storeUserConnection(
          user.userId,
          socket.id,
          this.serverId
        );

        // Store in local map
        this.connectedUsers.set(user.userId, user);

        // Update user's online status in database
        await User.findByIdAndUpdate(user.userId, {
          isOnline: true,
          lastSeen: new Date(),
        });

        console.log(
          `[SocketManager] User connected: ${user.username} (${user.userId})`
        );

        // Emit user online event to all clients
        this.io.emit("user_online", {
          userId: user.userId,
          username: user.username,
        });

        // Handle joining channels
        socket.on("join_channel", async (channelId: string) => {
          try {
            await this.handleJoinChannel(socket, channelId);
          } catch (error) {
            console.error("[SocketManager] Error joining channel:", error);
          }
        });

        // Handle leaving channels
        socket.on("leave_channel", async (channelId: string) => {
          try {
            await this.handleLeaveChannel(socket, channelId);
          } catch (error) {
            console.error("[SocketManager] Error leaving channel:", error);
          }
        });

        // Handle typing indicators
        socket.on("typing_start", (channelId: string) => {
          socket.to(channelId).emit("user_typing_start", {
            userId: user.userId,
            username: user.username,
            channelId,
          });
        });

        socket.on("typing_stop", (channelId: string) => {
          socket.to(channelId).emit("user_typing_stop", {
            userId: user.userId,
            username: user.username,
            channelId,
          });
        });

        // Handle disconnect
        socket.on("disconnect", async () => {
          await this.handleDisconnect(socket);
        });

        // Handle ping/pong for connection health
        socket.on("ping", () => {
          socket.emit("pong");
        });
      } catch (error) {
        console.error("[SocketManager] Error in connection setup:", error);
        socket.disconnect();
      }
    });
  }

  private async handleJoinChannel(socket: any, channelId: string) {
    const user = socket.data.user as AuthenticatedSocket;

    try {
      // Join the channel room
      await socket.join(channelId);

      // Update last seen in connection cache
      await ConnectionCache.updateLastSeen(user.userId);

      console.log(
        `[SocketManager] User ${user.username} joined channel ${channelId}`
      );

      // Emit to channel that user joined
      socket.to(channelId).emit("user_joined_channel", {
        userId: user.userId,
        username: user.username,
        channelId,
      });
    } catch (error) {
      console.error("[SocketManager] Error joining channel:", error);
      throw error;
    }
  }

  private async handleLeaveChannel(socket: any, channelId: string) {
    const user = socket.data.user as AuthenticatedSocket;

    try {
      // Leave the channel room
      await socket.leave(channelId);

      console.log(
        `[SocketManager] User ${user.username} left channel ${channelId}`
      );

      // Emit to channel that user left
      socket.to(channelId).emit("user_left_channel", {
        userId: user.userId,
        username: user.username,
        channelId,
      });
    } catch (error) {
      console.error("[SocketManager] Error leaving channel:", error);
      throw error;
    }
  }

  private async handleDisconnect(socket: any) {
    const user = socket.data.user as AuthenticatedSocket;

    try {
      // Remove from connection cache
      await ConnectionCache.removeUserConnection(user.userId);

      // Remove from local map
      this.connectedUsers.delete(user.userId);

      // Update user's offline status in database
      await User.findByIdAndUpdate(user.userId, {
        isOnline: false,
        lastSeen: new Date(),
      });

      console.log(
        `[SocketManager] User disconnected: ${user.username} (${user.userId})`
      );

      // Emit user offline event to all clients
      this.io.emit("user_offline", {
        userId: user.userId,
        username: user.username,
      });
    } catch (error) {
      console.error("[SocketManager] Error handling disconnect:", error);
    }
  }

  // Public methods for other services to use

  public emitToChannel(channelId: string, event: string, data: any) {
    this.io.to(channelId).emit(event, data);
    console.log(`[SocketManager] Emitted ${event} to channel ${channelId}`);
  }

  public emitToUser(userId: string, event: string, data: any) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.io.to(user.socketId).emit(event, data);
      console.log(`[SocketManager] Emitted ${event} to user ${user.username}`);
    } else {
      console.log(
        `[SocketManager] User ${userId} not connected to this server`
      );
    }
  }

  public getConnectedUsers(): AuthenticatedSocket[] {
    return Array.from(this.connectedUsers.values());
  }

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getServerId(): string {
    return this.serverId;
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}
