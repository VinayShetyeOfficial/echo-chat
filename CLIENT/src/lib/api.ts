import axios from "axios";
import { User, Channel, Message } from "../types";
import { getToken, getCurrentUser } from "@/lib/auth";

// Update the API URL to ensure it's correctly formatted
const API_URL = import.meta.env.VITE_API_URL || "/api";

// Updated fetchApi function with more debugging
const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  // Add default headers
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Get token from local storage if available
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_URL}${endpoint}`;

  try {
    // Try the first attempt using fetch
    const response = await fetch(url, {
      ...options,
      headers,
      mode: "cors",
      cache: "no-cache",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });

    // Parse JSON response
    const data = await response.json();

    // If response is not ok, create a detailed error
    if (!response.ok) {
      const error = new Error(data.message || "Request failed");

      // Add all available information to the error object
      (error as any).status = response.status;
      (error as any).data = data;

      // Preserve field information if present
      if (data.field) {
        (error as any).field = data.field;
      }

      throw error;
    }

    return data;
  } catch (error: any) {
    // Try alternative URL as fallback
    try {
      const fallbackUrl = `http://127.0.0.1:3001/api${endpoint}`;
      const altResponse = await fetch(fallbackUrl, {
        ...options,
        headers,
        mode: "cors",
        cache: "no-cache",
      });

      const altData = await altResponse.json();

      if (!altResponse.ok) {
        const altError = new Error(altData.message || "Request failed");
        (altError as any).status = altResponse.status;
        (altError as any).data = altData;

        if (altData.field) {
          (altError as any).field = altData.field;
        }

        throw altError;
      }

      return altData;
    } catch (fallbackError: any) {
      // Preserve the original error but add any additional information
      throw error;
    }
  }
};

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    fetchApi("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  signup: (username: string, email: string, password: string) =>
    fetchApi("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    }),
};

// User API
export const userApi = {
  getProfile: () => fetchApi("/users/profile"),
  updateProfile: (data: any) =>
    fetchApi("/users/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Add timeout to prevent hanging requests
  timeout: 5000,
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't log to console
    return Promise.reject(error);
  }
);

// Channels API
export const channelApi = {
  getChannels: () => fetchApi("/channels"),
  createChannel: (data: any) =>
    fetchApi("/channels", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getChannel: (id: string) => fetchApi(`/channels/${id}`),
  updateChannel: (id: string, data: any) =>
    fetchApi(`/channels/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteChannel: (id: string) =>
    fetchApi(`/channels/${id}`, {
      method: "DELETE",
    }),
};

// Messages API
export const messageApi = {
  getMessages: (channelId: string) =>
    fetchApi(`/messages?channelId=${channelId}`),
  sendMessage: (data: any) =>
    fetchApi("/messages", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateMessage: (id: string, data: any) =>
    fetchApi(`/messages/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteMessage: (id: string) =>
    fetchApi(`/messages/${id}`, {
      method: "DELETE",
    }),
};

// Helper function to log server errors
const logServerError = (error: any, context: string) => {
  console.error(`API Server Error (${context}):`, error);
  console.log("Falling back to mock data");
};

// Helper function to check if the server is available
const isServerAvailable = async (): Promise<boolean> => {
  try {
    // Use direct URL instead of relying on environment variables
    const response = await axios.get("http://localhost:3001/health", {
      timeout: 2000,
    });
    return response.status === 200;
  } catch (error) {
    console.error("Server is not available:", error);
    return false;
  }
};

// User APIs
export const getUsers = async (): Promise<User[]> => {
  try {
    const response = await apiClient.get("/users");
    return response.data.data;
  } catch (error) {
    console.error("Get users error:", error);
    throw error;
  }
};

export const getUser = async (userId: string): Promise<User> => {
  try {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data.data;
  } catch (error) {
    console.error("Get user error:", error);
    throw error;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await apiClient.get("/users");
    return response.data.data;
  } catch (error) {
    console.error("Get all users error:", error);
    throw error;
  }
};

// Channel APIs
export const createChannel = async (
  name: string,
  members: User[],
  isPrivate: boolean = false,
  isDirect: boolean = false
): Promise<Channel> => {
  try {
    const response = await apiClient.post("/channels", {
      name,
      type: isDirect ? "direct" : "group",
      isPrivate,
      memberIds: members.map((member) => member.id),
    });
    return response.data.data;
  } catch (error) {
    console.error("Create channel error:", error);
    throw error;
  }
};

export const getChannels = async (): Promise<Channel[]> => {
  try {
    const response = await apiClient.get("/channels");
    const currentUser = getCurrentUser();

    // Transform the server response to match client's expected format
    let channels = response.data.data.map((channel: any) => {
      // Transform the lastMessage if it exists
      let lastMessage = null;
      if (channel.lastMessage) {
        // Get the message text from either format
        const messageText = channel.lastMessage.content || "";

        // Try to get the sender/user from the message
        let messageSender = channel.lastMessage.user || null;

        // For direct messages with missing sender, we need special handling
        if (!messageSender && channel.type === "direct") {
          // Find other member (potential recipient) and current user in the channel
          const otherMember = channel.members?.find(
            (member: any) => currentUser && member.id !== currentUser.id
          );

          const currentUserMember = channel.members?.find(
            (member: any) => currentUser && member.id === currentUser.id
          );

          // ONLY auto-assign if we can confidently determine the message direction
          if (
            otherMember &&
            currentUser &&
            currentUserMember &&
            channel.name === otherMember.username
          ) {
            if (
              channel.lastMessage.userId === currentUser.id ||
              channel.lastMessage.createdBy === currentUser.id
            ) {
              messageSender = currentUser;
            }
          }
        }

        lastMessage = {
          id: channel.lastMessage.id,
          text: messageText,
          sender: messageSender,
          timestamp: new Date(channel.lastMessage.createdAt || Date.now()),
          channelId: channel.lastMessage.channelId,
          attachments: channel.lastMessage.attachments || [],
          reactions: channel.lastMessage.reactions || [],
          isEdited: channel.lastMessage.isEdited || false,
          replyTo: channel.lastMessage.replyTo,
        };
      }

      return {
        ...channel,
        lastMessage: lastMessage,
      };
    });

    // Sort channels with most recent message first
    channels = channels.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp || new Date(0);
      const bTime = b.lastMessage?.timestamp || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });

    return channels;
  } catch (error) {
    // Instead of logging to console, return empty array
    return [];
  }
};

export const getChannel = async (channelId: string): Promise<Channel> => {
  try {
    const response = await apiClient.get(`/channels/${channelId}`);
    const currentUser = getCurrentUser();

    // Get the server channel data
    const serverChannel = response.data.data;

    // Transform the lastMessage if it exists
    let lastMessage = null;
    if (serverChannel.lastMessage) {
      // Get the message text from either format
      const messageText = serverChannel.lastMessage.content || "";

      // Try to get the sender/user from the message
      let messageSender = serverChannel.lastMessage.user || null;

      // For direct messages with missing sender, we need special handling
      if (!messageSender && serverChannel.type === "direct") {
        // Find other member (potential recipient) and current user in the channel
        const otherMember = serverChannel.members?.find(
          (member: any) => currentUser && member.id !== currentUser.id
        );

        const currentUserMember = serverChannel.members?.find(
          (member: any) => currentUser && member.id === currentUser.id
        );

        // ONLY auto-assign if we can confidently determine the message direction
        if (
          otherMember &&
          currentUser &&
          currentUserMember &&
          serverChannel.name === otherMember.username
        ) {
          if (
            serverChannel.lastMessage.userId === currentUser.id ||
            serverChannel.lastMessage.createdBy === currentUser.id
          ) {
            messageSender = currentUser;
          }
        }
      }

      lastMessage = {
        id: serverChannel.lastMessage.id,
        text: messageText,
        sender: messageSender,
        timestamp: new Date(serverChannel.lastMessage.createdAt || Date.now()),
        channelId: serverChannel.lastMessage.channelId,
        attachments: serverChannel.lastMessage.attachments || [],
        reactions: serverChannel.lastMessage.reactions || [],
        isEdited: serverChannel.lastMessage.isEdited || false,
        replyTo: serverChannel.lastMessage.replyTo,
      };
    }

    // Return the transformed channel
    return {
      ...serverChannel,
      lastMessage: lastMessage,
    };
  } catch (error) {
    console.error("Get channel error:", error);
    throw error;
  }
};

export const updateChannel = async (
  channelId: string,
  data: { name?: string; description?: string; isPrivate?: boolean }
): Promise<Channel> => {
  try {
    const response = await apiClient.put(`/channels/${channelId}`, data);
    return response.data.data;
  } catch (error) {
    console.error("Update channel error:", error);
    throw error;
  }
};

export const deleteChannel = async (channelId: string): Promise<void> => {
  try {
    await apiClient.delete(`/channels/${channelId}`);
  } catch (error) {
    console.error("Delete channel error:", error);
    throw error;
  }
};

export const addChannelMember = async (
  channelId: string,
  userId: string,
  role?: "admin" | "member"
): Promise<void> => {
  try {
    await apiClient.post(`/channels/${channelId}/members`, { userId, role });
  } catch (error) {
    console.error("Add channel member error:", error);
    throw error;
  }
};

export const removeChannelMember = async (
  channelId: string,
  userId: string
): Promise<void> => {
  try {
    await apiClient.delete(`/channels/${channelId}/members/${userId}`);
  } catch (error) {
    console.error("Remove channel member error:", error);
    throw error;
  }
};

// Message APIs
export const getMessagesForChannel = async (
  channelId: string,
  since?: number
): Promise<Message[]> => {
  try {
    // Build URL with optional since parameter
    const url = since
      ? `/messages/channel/${channelId}?since=${since}`
      : `/messages/channel/${channelId}`;

    // Get messages from the API
    const apiResponse = await apiClient.get(url);

    // Check if we have data in the expected format
    if (!apiResponse.data || !apiResponse.data.data) {
      console.error("Invalid API response format:", apiResponse);
      return [];
    }

    const apiMessages = transformApiMessages(apiResponse.data.data || []);

    // Return API messages
    return apiMessages;
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
};

export const sendMessage = async (
  channelId: string,
  content: string,
  attachments: File[] = []
) => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    // Process attachments if any...

    // Send message via API
    const response = await apiClient.post("/messages", {
      channelId,
      content,
      attachmentIds: [], // Or whatever you need for attachments
    });
    return response.data.data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Helper functions to determine file metadata
function getFileType(url: string): string {
  // Extract file extension from URL
  const extension = url.split(".").pop()?.toLowerCase();

  // Determine type based on common extensions
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || "")) {
    return "image";
  } else if (["mp3", "wav", "ogg", "m4a"].includes(extension || "")) {
    return "audio";
  } else {
    return "file";
  }
}

function getFileName(url: string): string {
  // Extract filename from URL
  return url.split("/").pop() || "file";
}

function getMimeType(url: string): string {
  // Basic MIME type detection based on extension
  const extension = url.split(".").pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/m4a",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
  };

  return mimeTypes[extension || ""] || "application/octet-stream";
}

export const updateMessage = async (
  messageId: string,
  content: string
): Promise<Message> => {
  try {
    const response = await apiClient.put(`/messages/${messageId}`, { content });

    // Transform server response to client format
    const serverMessage = response.data.data;

    // Map from server format to client format
    const clientMessage: Message = {
      id: serverMessage.id,
      text: serverMessage.content, // Map 'content' to 'text'
      sender: serverMessage.user, // Map 'user' to 'sender'
      timestamp: new Date(
        serverMessage.createdAt || serverMessage.updatedAt || Date.now()
      ),
      channelId: serverMessage.channelId,
      attachments: serverMessage.attachments || [],
      reactions: serverMessage.reactions || [],
      isEdited: serverMessage.isEdited || false,
      replyTo: serverMessage.replyTo,
    };

    return clientMessage;
  } catch (error) {
    console.error("Update message error:", error);
    throw error;
  }
};

export const deleteMessage = async (messageId: string): Promise<boolean> => {
  try {
    await apiClient.delete(`/messages/${messageId}`);
    return true;
  } catch (error) {
    console.error("Delete message error:", error);
    return false;
  }
};

export const addReaction = async (
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> => {
  try {
    await apiClient.post(`/messages/${messageId}/reactions`, { userId, emoji });
  } catch (error) {
    console.error("Add reaction error:", error);
    throw error;
  }
};

export const removeReaction = async (
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> => {
  try {
    await apiClient.delete(
      `/messages/${messageId}/reactions/${emoji}?userId=${userId}`
    );
  } catch (error) {
    console.error("Remove reaction error:", error);
    throw error;
  }
};

export const reactToMessage = async (
  messageId: string,
  emoji: string
): Promise<{ messageId: string; reaction: any }> => {
  try {
    const response = await apiClient.post(`/messages/${messageId}/reactions`, {
      emoji,
    });
    return response.data.data;
  } catch (error) {
    console.error("React to message error:", error);
    throw error;
  }
};

// Invitation APIs
export const createInvitation = async (
  channelId?: string,
  email?: string,
  expiresIn?: number
): Promise<any> => {
  try {
    const response = await apiClient.post("/invitations", {
      channelId,
      email,
      expiresIn,
    });
    return response.data.data;
  } catch (error) {
    console.error("Create invitation error:", error);
    throw error;
  }
};

export const verifyInvitation = async (code: string): Promise<any> => {
  try {
    const response = await apiClient.get(`/invitations/${code}/verify`);
    return response.data.data;
  } catch (error) {
    console.error("Verify invitation error:", error);
    throw error;
  }
};

export const redeemInvitation = async (code: string): Promise<any> => {
  try {
    const response = await apiClient.post(`/invitations/${code}/redeem`);
    return response.data.data;
  } catch (error) {
    console.error("Redeem invitation error:", error);
    throw error;
  }
};

export const getUserInvitations = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get("/invitations");
    return response.data.data;
  } catch (error) {
    console.error("Get user invitations error:", error);
    throw error;
  }
};

export const getPublicInviteDetails = async (code: string): Promise<any> => {
  try {
    // Use a direct axios call instead of apiClient to avoid auth headers
    const response = await axios.get(
      `http://localhost:3001/api/invitations/${code}/public`
    );
    return response.data.data;
  } catch (error) {
    console.error("Get public invite details error:", error);
    throw error;
  }
};

// Helper function to ensure valid dates
const ensureValidDate = (dateInput: any): Date => {
  if (!dateInput) return new Date();

  try {
    const date = new Date(dateInput);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid date detected:", dateInput);
      return new Date(); // Return current date as fallback
    }
    return date;
  } catch (e) {
    console.warn("Error parsing date:", e);
    return new Date(); // Return current date as fallback
  }
};

// Helper functions
const transformSupabaseMessages = (messages: any[] | null): Message[] => {
  if (!messages) return [];

  return messages.map((msg) => ({
    id: msg.id,
    text: msg.content,
    sender: msg.user,
    timestamp: ensureValidDate(msg.createdAt),
    channelId: msg.channelId,
    attachments: msg.attachments || [],
    reactions: msg.reactions || [],
    isEdited: msg.isEdited || false,
    replyTo: msg.replyTo,
  }));
};

const mergeAndDeduplicate = (messages: Message[]): Message[] => {
  const uniqueMessages = new Map();
  messages.forEach((msg) => uniqueMessages.set(msg.id, msg));
  return Array.from(uniqueMessages.values()).sort(
    (a, b) =>
      ensureValidDate(a.timestamp).getTime() -
      ensureValidDate(b.timestamp).getTime()
  );
};

// Make a helper function to ensure a valid sender object is created
const ensureValidSender = (sender: any, currentUser: any): any => {
  if (!sender) {
    console.warn("No sender provided, using current user or placeholder");
    if (currentUser) {
      return currentUser;
    }
    return {
      id: "unknown",
      username: "Unknown User",
      avatar: null,
      isOnline: false,
    };
  }

  // Make sure sender has minimally required fields
  return {
    id: sender.id || "unknown",
    username: sender.username || "Unknown User",
    avatar: sender.avatar || null,
    isOnline: sender.isOnline || false,
    ...sender,
  };
};

// Update the transformApiMessages function to properly handle message content
const transformApiMessages = (messages: any[]): Message[] => {
  // Get current user from localStorage to help with sender identification
  let currentUser = null;
  try {
    const userJson = localStorage.getItem("currentUser");
    if (userJson) {
      currentUser = JSON.parse(userJson);
    }
  } catch (e) {
    console.warn("Error parsing current user", e);
  }

  return messages.map((msg) => {
    // Debug the message payload
    console.log("API Message payload:", JSON.stringify(msg, null, 2));

    const msgSender = msg.user || msg.sender;
    const userId = msgSender?.id || msg.userId;

    // Check if this is a message from the current user
    let sender = msgSender;
    if (userId && currentUser && userId === currentUser.id) {
      sender = currentUser;
    }

    // Extract message content with multiple fallbacks
    const messageContent = msg.text || msg.content || msg.message || "";

    if (!messageContent.trim()) {
      console.warn("Empty message content detected in message:", msg.id);
    }

    return {
      id: msg.id,
      text: messageContent,
      sender: ensureValidSender(sender, currentUser),
      timestamp: ensureValidDate(msg.createdAt || msg.timestamp),
      channelId: msg.channelId,
      attachments: msg.attachments || [],
      reactions: msg.reactions || [],
      isEdited: msg.isEdited || false,
      replyTo: msg.replyTo,
    };
  });
};
