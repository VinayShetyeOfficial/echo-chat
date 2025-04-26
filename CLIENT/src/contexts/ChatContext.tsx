import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
} from "react";
import {
  Channel,
  User,
  Message,
  Attachment,
  Reaction,
  ChatContextType,
} from "../types";
import { useAuth } from "./AuthContext";
import { toast as sonnerToast } from "sonner";
import { CheckCircle } from "lucide-react";
import {
  getChannels,
  getMessagesForChannel,
  sendMessage as apiSendMessage,
  updateMessage as apiUpdateMessage,
  deleteMessage as apiDeleteMessage,
  addReaction,
  removeReaction,
  createChannel as apiCreateChannel,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import { io, Socket } from "socket.io-client";
import { messageApi } from "../lib/api";

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    const fetchChannels = async () => {
      if (!user) {
        setChannels([]);
        setActiveChannel(null);
        setMessages([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userChannels = await getChannels();
        const channelsWithUnread = userChannels.map((ch) => ({
          ...ch,
          unreadCount: 0,
        }));
        setChannels(channelsWithUnread);

        if (channelsWithUnread.length > 0 && !activeChannel) {
          const initialChannel = channelsWithUnread[0];
          setActiveChannel(initialChannel);
          await fetchMessages(initialChannel.id);
        } else if (channelsWithUnread.length === 0) {
          // New user with no channels
          console.log(
            "No channels found for user. Create a new channel or start a direct message."
          );
          setActiveChannel(null);
          setMessages([]);
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
        // Don't show error toast for new users with no channels
        if (error instanceof Error && !error.message.includes("No channels")) {
          sonnerToast.error("Error fetching channels");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      const SOCKET_URL =
        import.meta.env.VITE_API_URL || "http://localhost:3001";

      const socketInstance = io(SOCKET_URL, {
        auth: {
          token: localStorage.getItem("token"),
        },
      });

      socketInstance.on("connect", () => {
        console.log("Socket connected:", socketInstance.id);
      });

      socketInstance.on("disconnect", () => {
        console.log("Socket disconnected");
      });

      setSocket(socketInstance);

      // Clean up socket on unmount
      return () => {
        socketInstance.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    if (socket && activeChannel) {
      // Leave previous channel if any
      socket.emit("leave_channel", { channelId: activeChannel.id });

      // Join new channel
      socket.emit("join_channel", { channelId: activeChannel.id });

      // Load messages for this channel
      fetchMessages(activeChannel.id);

      // Listen for new messages
      socket.on("new_message", (message: Message) => {
        setMessages((prev) => [...prev, message]);
      });
    }

    return () => {
      // Remove event listeners
      if (socket) {
        socket.off("new_message");
      }
    };
  }, [socket, activeChannel]);

  const fetchMessages = async (channelId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await messageApi.getMessages(channelId);
      setMessages(response.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch messages");
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetActiveChannel = async (channel: Channel) => {
    setMessages([]);
    setActiveChannel(channel);
    console.log("Setting active channel:", channel.id, channel.type);

    await fetchMessages(channel.id);
  };

  const sendMessage = async (content: string, attachments: File[] = []) => {
    if (!activeChannel || !user) return;

    try {
      const messageData = {
        text: content,
        channelId: activeChannel.id,
        attachments: [],
      };

      // Send via API
      await messageApi.sendMessage(messageData);

      // Socket will handle adding the message to the UI via the 'new_message' event
    } catch (err: any) {
      setError(err.message || "Failed to send message");
      console.error("Error sending message:", err);
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!activeChannel) return;
    try {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, text: newContent, isEdited: true } : m
        )
      );
      const updated = await apiUpdateMessage(messageId, newContent);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? updated : m))
      );
      sonnerToast.success("Message updated", {
        icon: <CheckCircle className="h-4 w-4" />,
      });
    } catch (err) {
      console.error("Edit message error:", err);
      sonnerToast.error("Failed to edit message");
      await fetchMessages(activeChannel.id);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!activeChannel) return;
    try {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      const success = await apiDeleteMessage(messageId);
      if (!success) {
        await fetchMessages(activeChannel.id);
        throw new Error("Delete failed");
      }
      sonnerToast.success("Message deleted", {
        icon: <CheckCircle className="h-4 w-4" />,
      });
    } catch (err) {
      console.error("Delete message error:", err);
      sonnerToast.error("Failed to delete");
      await fetchMessages(activeChannel.id);
    }
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const userReacted = msg.reactions?.some(
      (r) => r.emoji === emoji && r.users.includes(user.id)
    );

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const updated = { ...m };
        const reactionsCopy = [...(updated.reactions || [])];
        if (userReacted) {
          updated.reactions = reactionsCopy
            .map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: r.count - 1,
                    users: r.users.filter((u) => u !== user.id),
                  }
                : r
            )
            .filter((r) => r.count > 0);
        } else {
          const existing = reactionsCopy.find((r) => r.emoji === emoji);
          if (existing) {
            existing.count += 1;
            existing.users.push(user.id);
          } else {
            reactionsCopy.push({ emoji, count: 1, users: [user.id] });
          }
          updated.reactions = reactionsCopy;
        }
        return updated;
      })
    );

    try {
      if (userReacted) {
        await removeReaction(messageId, user.id, emoji);
      } else {
        await addReaction(messageId, user.id, emoji);
      }
    } catch (err) {
      console.error("React to message error:", err);
      sonnerToast.error("Failed to update reaction");
      await fetchMessages(activeChannel.id);
    }
  };

  const createChannel = async (
    name: string,
    selectedUsers: User[],
    isPrivate: boolean,
    isDirect: boolean
  ): Promise<Channel> => {
    if (!user) throw new Error("Not logged in");
    if (isDirect && selectedUsers.length !== 1) {
      throw new Error("Direct messages must have exactly one recipient");
    }

    try {
      const recipient = isDirect ? selectedUsers[0] : null;
      const channelName = isDirect ? recipient?.username : name;

      const newCh = await apiCreateChannel(
        channelName!,
        selectedUsers,
        isPrivate,
        isDirect
      );

      const processed: Channel = {
        ...newCh,
        name: channelName!,
        unreadCount: 0,
        members: isDirect ? [user, recipient!] : [user, ...selectedUsers],
        type: isDirect ? "direct" : "group",
        isPrivate: isPrivate || isDirect,
        createdAt: newCh.createdAt || new Date(),
        id: newCh.id,
        description: newCh.description || undefined,
        lastMessage: newCh.lastMessage,
      };

      if (!channels.some((c) => c.id === processed.id)) {
        setChannels((prev) => [processed, ...prev]);
      }

      setActiveChannel(processed);
      await fetchMessages(processed.id);

      sonnerToast.success(
        isDirect
          ? `Started conversation with ${recipient?.username}`
          : `Created channel #${channelName}`
      );

      return processed;
    } catch (err: any) {
      console.error("Create channel error:", err);
      sonnerToast.error("Failed to create channel");
      throw err;
    }
  };

  const contextValue: ChatContextType = {
    channels,
    activeChannel,
    messages,
    loading,
    setActiveChannel: handleSetActiveChannel,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    createChannel,
    currentlyEditingId: null,
    setCurrentlyEditingId: () => {},
  };

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
};
