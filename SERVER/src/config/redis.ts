import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = createClient({ url: REDIS_URL });

redisClient.on("connect", () => {
  console.log("✅ Redis client connecting...");
});
redisClient.on("ready", () => {
  console.log("✅ Redis client connected and ready!");
});
redisClient.on("error", (err) => {
  console.error("❌ Redis client error:", err);
});
redisClient.on("end", () => {
  console.log("❌ Redis client connection closed");
});

// Connect immediately
redisClient.connect().catch((err) => {
  console.error("❌ Redis initial connection error:", err);
});
