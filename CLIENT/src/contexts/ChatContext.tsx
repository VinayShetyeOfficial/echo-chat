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
  const [currentlyEditingId, setCurrentlyEditingId] = useState<string | null>(
    null
  );

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

        const channelsWithUnread = Array.isArray(userChannels)
          ? userChannels.map((ch) => ({
              ...ch,
              unreadCount: 0,
            }))
          : [];

        setChannels(channelsWithUnread);

        if (channelsWithUnread.length > 0) {
          const currentActiveChannelIsValid =
            activeChannel &&
            channelsWithUnread.some((ch) => ch.id === activeChannel.id);

          if (!currentActiveChannelIsValid) {
            const initialChannel = channelsWithUnread[0];
            console.log(
              "[fetchChannels] Setting initial active channel:",
              initialChannel
            );
            if (initialChannel && initialChannel.id) {
              setActiveChannel(initialChannel);
              await fetchMessages(initialChannel.id);
            } else {
              console.error(
                "[fetchChannels] Error: Initial channel or its ID is missing!",
                initialChannel
              );
              setActiveChannel(null);
              setMessages([]);
            }
          } else {
            console.log(
              "[fetchChannels] Current active channel is still valid."
            );
          }
        } else {
          console.log(
            "No channels found for user. Create a new channel or start a direct message."
          );
          setActiveChannel(null);
          setMessages([]);
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
        if (error instanceof Error && !error.message.includes("No channels")) {
          sonnerToast.error("Error fetching channels");
        }
        setActiveChannel(null);
        setMessages([]);
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
    if (!socket) return;

    // Listener function for new messages
    const handleNewMessage = (rawMessage: any) => {
      // Map _id to id for consistency
      const message: Message = {
        ...rawMessage,
        id: rawMessage._id || rawMessage.id, // Map _id to id
        sender: rawMessage.sender
          ? {
              ...rawMessage.sender,
              id: rawMessage.sender._id || rawMessage.sender.id, // Map sender._id to sender.id
            }
          : undefined,
        // Ensure timestamp is a Date object
        timestamp: rawMessage.timestamp
          ? new Date(rawMessage.timestamp)
          : new Date(),
      };

      // Update message list if it belongs to the active channel
      if (message.channelId === activeChannel?.id) {
        setMessages((prev) => [...prev, message]);
      }

      // Update the lastMessage for the corresponding channel in the sidebar
      setChannels((prevChannels) =>
        prevChannels.map((channel) =>
          channel.id === message.channelId
            ? { ...channel, lastMessage: message }
            : channel
        )
      );

      // Optionally: handle notifications for messages in other channels
      if (message.channelId !== activeChannel?.id) {
        console.log(
          `Received message for inactive channel ${message.channelId}`
        );
        // You could update unread counts here
      }
    };

    // Set up the listener
    socket.on("new_message", handleNewMessage);
    console.log(`Socket listener for 'new_message' attached.`);

    // Join the active channel room if available
    if (activeChannel && activeChannel.id) {
      console.log(`Emitting join_channel for ${activeChannel.id}`);
      socket.emit("join_channel", { channelId: activeChannel.id });
    }

    // Cleanup function
    return () => {
      console.log(`Cleaning up socket listener for 'new_message'.`);
      socket.off("new_message", handleNewMessage);

      // Leave the channel room when the component unmounts or activeChannel changes
      if (activeChannel && activeChannel.id) {
        console.log(`Emitting leave_channel for ${activeChannel.id}`);
        socket.emit("leave_channel", { channelId: activeChannel.id });
      }
    };
  }, [socket, activeChannel]); // Re-run this effect when socket or activeChannel changes

  const fetchMessages = async (channelId: string) => {
    // Skip if no channelId is provided
    if (!channelId) {
      console.log("No channel ID provided, skipping message fetch");
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await messageApi.getMessages(channelId);

      // Process messages to ensure ID mapping
      const processedMessages = (response.data || []).map((msg: any) => ({
        ...msg,
        id: msg._id || msg.id,
        sender: msg.sender
          ? {
              ...msg.sender,
              id: msg.sender._id || msg.sender.id,
            }
          : null, // Handle cases where sender might be null
      }));

      setMessages(processedMessages);
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

    // 1. Create a temporary message object for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: Message = {
      id: tempId, // Temporary ID
      text: content,
      sender: user, // Use the current logged-in user as the sender
      timestamp: new Date(),
      channelId: activeChannel.id,
      attachments: [], // Handle attachments properly if needed
      reactions: [],
      isEdited: false,
    };

    // 2. Optimistically update the UI
    setMessages((prev) => [...prev, optimisticMessage]);

    // Also optimistically update the channel's lastMessage
    setChannels((prevChannels) =>
      prevChannels.map((channel) =>
        channel.id === activeChannel.id
          ? { ...channel, lastMessage: optimisticMessage }
          : channel
      )
    );

    try {
      const messageData = {
        text: content,
        channelId: activeChannel.id,
        attachments: [], // Send attachment data if implementing uploads
      };

      // DEBUG: Log the data being sent
      console.log("[sendMessage] Sending data:", messageData);
      if (!messageData.channelId) {
        console.error("[sendMessage] Error: channelId is missing!");
        throw new Error("Cannot send message: Channel ID is missing.");
      }
      if (!messageData.text) {
        console.error("[sendMessage] Error: Message text is missing!");
        throw new Error("Cannot send message: Message text is missing.");
      }

      // 3. Send via API
      const apiResponse = await messageApi.sendMessage(messageData);

      // Extract the actual message data from the response
      const savedMessageData = apiResponse.data;

      // Process the saved message data to ensure ID mapping and correct structure
      const processedSavedMessage: Message = {
        // Spread the fields from savedMessageData, not the whole apiResponse
        id: savedMessageData._id || savedMessageData.id,
        text: savedMessageData.text || "", // Ensure text exists
        sender: savedMessageData.sender
          ? {
              // Process the nested sender object
              ...(savedMessageData.sender as any), // Spread sender fields
              id: savedMessageData.sender._id || savedMessageData.sender.id, // Map sender ID
            }
          : user, // Fallback to current user if sender is missing
        timestamp: new Date(
          savedMessageData.updatedAt || savedMessageData.createdAt || Date.now()
        ), // Use correct timestamp fields
        channelId: savedMessageData.channelId || activeChannel.id, // Ensure channelId exists
        attachments: savedMessageData.attachments || [],
        reactions: savedMessageData.reactions || [],
        isEdited: savedMessageData.isEdited || false,
        replyTo: savedMessageData.replyTo, // Add replyTo if it exists
      };

      // 4. Update the temporary message with the processed one from the server
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? processedSavedMessage : msg))
      );
      // Also update the channel's lastMessage with the confirmed message
      setChannels((prevChannels) =>
        prevChannels.map((channel) =>
          channel.id === activeChannel.id
            ? { ...channel, lastMessage: processedSavedMessage }
            : channel
        )
      );

      // Socket event will handle updates for other users
      // and potentially sync if needed, but sender sees message immediately
    } catch (err: any) {
      setError(err.message || "Failed to send message");
      console.error("Error sending message:", err);
      // 5. Remove the optimistic message if the API call failed
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      // Revert optimistic channel update on failure
      setChannels((prevChannels) =>
        prevChannels.map((channel) => {
          if (channel.id === activeChannel.id) {
            // Find the previous last message before the optimistic one
            // This requires fetching messages again or storing previous state, which is complex.
            // For simplicity, we might just refetch channels or leave it slightly stale.
            // Or, if messages state is sorted, take the second to last message.
            const messagesForChannel = messages.filter(
              (m) => m.channelId === channel.id && m.id !== tempId
            );
            const prevLastMessage =
              messagesForChannel.length > 0
                ? messagesForChannel[messagesForChannel.length - 1]
                : undefined;
            return { ...channel, lastMessage: prevLastMessage };
          }
          return channel;
        })
      );
      sonnerToast.error("Failed to send message. Please try again.");
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

      // Ensure the recipient is valid
      if (isDirect && (!recipient || !recipient.id)) {
        throw new Error("Invalid recipient for direct message");
      }

      const channelName = isDirect ? recipient?.username : name;

      // Create channel via API
      const newCh = await apiCreateChannel(
        channelName!,
        selectedUsers,
        isPrivate,
        isDirect
      );

      // For local display, create a properly formatted channel object
      const processed: Channel = {
        ...newCh,
        name: channelName!,
        unreadCount: 0,
        // For direct messages, ensure the members array contains valid User objects
        members: isDirect
          ? [
              // Current user
              {
                id: user.id,
                username: user.username,
                email: user.email,
                isOnline: user.isOnline,
                ...(user.avatar && { avatar: user.avatar }),
              },
              // Recipient
              {
                id: recipient!.id,
                username: recipient!.username,
                email: recipient!.email,
                isOnline: recipient!.isOnline,
                ...(recipient!.avatar && { avatar: recipient!.avatar }),
              },
            ]
          : [user, ...selectedUsers],
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

      // Set the active channel first and make sure it's properly set
      // before fetching messages
      setActiveChannel(processed);

      // Ensure channel ID is defined before fetching messages
      if (processed.id) {
        await fetchMessages(processed.id);
      } else {
        console.warn("New channel created but ID is undefined");
      }

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
    currentlyEditingId,
    setCurrentlyEditingId,
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
