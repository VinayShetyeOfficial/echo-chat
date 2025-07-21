import { redisClient } from "../config/redis";

interface UserConnection {
  userId: string;
  socketId: string;
  serverId: string;
  connectedAt: number;
  lastSeen: number;
}

export class ConnectionCache {
  private static readonly USER_PREFIX = "user:";
  private static readonly SERVER_PREFIX = "server:";
  private static readonly ONLINE_PREFIX = "online:";
  private static readonly TTL = 24 * 60 * 60; // 24 hours in seconds

  /**
   * Store user connection information
   */
  static async storeUserConnection(
    userId: string,
    socketId: string,
    serverId: string
  ): Promise<void> {
    const connection: UserConnection = {
      userId,
      socketId,
      serverId,
      connectedAt: Date.now(),
      lastSeen: Date.now(),
    };

    const key = `${this.USER_PREFIX}${userId}`;
    const serverKey = `${this.SERVER_PREFIX}${serverId}`;
    const onlineKey = `${this.ONLINE_PREFIX}${userId}`;

    try {
      // Store user connection details
      await redisClient.setEx(key, this.TTL, JSON.stringify(connection));

      // Add user to server's connected users set
      await redisClient.sAdd(serverKey, userId);
      await redisClient.expire(serverKey, this.TTL);

      // Mark user as online
      await redisClient.setEx(onlineKey, this.TTL, "true");

      console.log(
        `[ConnectionCache] User ${userId} connected to server ${serverId}`
      );
    } catch (error) {
      console.error("[ConnectionCache] Error storing user connection:", error);
      throw error;
    }
  }

  /**
   * Remove user connection information
   */
  static async removeUserConnection(userId: string): Promise<void> {
    try {
      const key = `${this.USER_PREFIX}${userId}`;
      const onlineKey = `${this.ONLINE_PREFIX}${userId}`;

      // Get connection info before removing
      const connectionData = await redisClient.get(key);
      if (connectionData) {
        const connection: UserConnection = JSON.parse(connectionData);
        const serverKey = `${this.SERVER_PREFIX}${connection.serverId}`;

        // Remove from server's connected users
        await redisClient.sRem(serverKey, userId);

        // Remove user connection and online status
        await redisClient.del(key);
        await redisClient.del(onlineKey);

        console.log(
          `[ConnectionCache] User ${userId} disconnected from server ${connection.serverId}`
        );
      }
    } catch (error) {
      console.error("[ConnectionCache] Error removing user connection:", error);
      throw error;
    }
  }

  /**
   * Get user connection information
   */
  static async getUserConnection(
    userId: string
  ): Promise<UserConnection | null> {
    try {
      const key = `${this.USER_PREFIX}${userId}`;
      const data = await redisClient.get(key);

      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error("[ConnectionCache] Error getting user connection:", error);
      return null;
    }
  }

  /**
   * Check if user is online
   */
  static async isUserOnline(userId: string): Promise<boolean> {
    try {
      const key = `${this.ONLINE_PREFIX}${userId}`;
      const result = await redisClient.get(key);
      return result === "true";
    } catch (error) {
      console.error(
        "[ConnectionCache] Error checking user online status:",
        error
      );
      return false;
    }
  }

  /**
   * Get all users connected to a specific server
   */
  static async getServerUsers(serverId: string): Promise<string[]> {
    try {
      const key = `${this.SERVER_PREFIX}${serverId}`;
      const users = await redisClient.sMembers(key);
      return users;
    } catch (error) {
      console.error("[ConnectionCache] Error getting server users:", error);
      return [];
    }
  }

  /**
   * Update user's last seen timestamp
   */
  static async updateLastSeen(userId: string): Promise<void> {
    try {
      const key = `${this.USER_PREFIX}${userId}`;
      const data = await redisClient.get(key);

      if (data) {
        const connection: UserConnection = JSON.parse(data);
        connection.lastSeen = Date.now();
        await redisClient.setEx(key, this.TTL, JSON.stringify(connection));
      }
    } catch (error) {
      console.error("[ConnectionCache] Error updating last seen:", error);
    }
  }

  /**
   * Get all online users
   */
  static async getOnlineUsers(): Promise<string[]> {
    try {
      const pattern = `${this.ONLINE_PREFIX}*`;
      const keys = await redisClient.keys(pattern);
      const userIds = keys.map((key) => key.replace(this.ONLINE_PREFIX, ""));
      return userIds;
    } catch (error) {
      console.error("[ConnectionCache] Error getting online users:", error);
      return [];
    }
  }

  /**
   * Clean up expired connections (can be called periodically)
   */
  static async cleanupExpiredConnections(): Promise<void> {
    try {
      const userPattern = `${this.USER_PREFIX}*`;
      const userKeys = await redisClient.keys(userPattern);

      for (const key of userKeys) {
        const data = await redisClient.get(key);
        if (data) {
          const connection: UserConnection = JSON.parse(data);
          const now = Date.now();
          const lastSeen = connection.lastSeen;

          // Remove if last seen was more than 5 minutes ago
          if (now - lastSeen > 5 * 60 * 1000) {
            await this.removeUserConnection(connection.userId);
          }
        }
      }

      console.log("[ConnectionCache] Cleanup completed");
    } catch (error) {
      console.error("[ConnectionCache] Error during cleanup:", error);
    }
  }
}
