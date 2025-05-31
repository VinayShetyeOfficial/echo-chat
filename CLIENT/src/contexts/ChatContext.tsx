"use client";

import type React from "react";
import { createContext, useState, useContext, useEffect, useMemo } from "react";
import type {
  Channel,
  User,
  Message,
  ChatContextType,
  Attachment,
} from "../types";
import { useAuth } from "./AuthContext";
import { toast as sonnerToast } from "sonner";
import { CheckCircle } from "lucide-react";
import {
  getChannels,
  updateMessage as apiUpdateMessage,
  deleteMessage as apiDeleteMessage,
  reactToMessage as apiReactToMessage,
  createChannel as apiCreateChannel,
} from "@/lib/api";
import { io, type Socket } from "socket.io-client";
import { messageApi } from "../lib/api";
import { uploadFiles } from "@/lib/uploadFile";
import axios from "axios";

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
  const [activeReplyTo, setActiveReplyTo] = useState<Message | null>(null);

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
  }, [user]);

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
        timestamp: rawMessage.createdAt // Use createdAt from server
          ? new Date(rawMessage.createdAt)
          : new Date(),
        // Calculate reaction counts from users array length
        reactions: (rawMessage.reactions || []).map((r: any) => ({
          ...r,
          count: r.users?.length || 0,
        })),
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

    // Listener function for updated messages (e.g., reactions, edits)
    const handleMessageUpdated = (rawMessage: any) => {
      console.log("[Socket] Received message_updated:", rawMessage);

      // Extract and log reaction data for debugging
      if (rawMessage.reactions && rawMessage.reactions.length > 0) {
        console.log(
          "[Socket] Raw reaction data received:",
          JSON.stringify(rawMessage.reactions, null, 2)
        );
      }

      // Calculate reaction counts based on users array length
      const processedReactions = (rawMessage.reactions || []).map((r: any) => {
        // Always normalize users to an array
        const users = Array.isArray(r.users) ? r.users : [];
        // Set count based on users length
        return {
          ...r,
          emoji: r.emoji,
          users: users.map((u: any) => u?.toString() || u),
          // IMPORTANT: Always calculate count based on users array length
          count: users.length,
        };
      });

      console.log(
        "[Socket] Processed reactions with counts:",
        processedReactions.map((r) => ({ emoji: r.emoji, count: r.count }))
      );

      const updatedMessage: Message = {
        ...rawMessage,
        id: rawMessage._id || rawMessage.id,
        sender: rawMessage.sender
          ? {
              ...rawMessage.sender,
              id: rawMessage.sender._id || rawMessage.sender.id,
            }
          : undefined,
        timestamp: rawMessage.createdAt
          ? new Date(rawMessage.createdAt)
          : new Date(),
        reactions: processedReactions, // Use our processed reactions
      };

      // Update the specific message in the list
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
      );

      // Also update lastMessage in the channel list if this is the latest message
      setChannels((prevChannels) =>
        prevChannels.map((channel) => {
          if (channel.id === updatedMessage.channelId) {
            // Check if this updated message is newer than the current lastMessage
            const currentLastMessageTimestamp = channel.lastMessage?.timestamp
              ? new Date(channel.lastMessage.timestamp).getTime()
              : 0;
            const updatedMessageTimestamp = updatedMessage.timestamp.getTime();

            if (updatedMessageTimestamp >= currentLastMessageTimestamp) {
              return { ...channel, lastMessage: updatedMessage };
            }
          }
          return channel;
        })
      );
    };

    // Set up the listeners
    socket.on("new_message", handleNewMessage);
    socket.on("message_updated", handleMessageUpdated); // Add listener for updates
    console.log(
      `Socket listeners for 'new_message' and 'message_updated' attached.`
    );

    // Join the active channel room if available
    if (activeChannel && activeChannel.id) {
      console.log(`Emitting join_channel for ${activeChannel.id}`);
      socket.emit("join_channel", { channelId: activeChannel.id });
    }

    // Cleanup function
    return () => {
      console.log(
        `Cleaning up socket listeners for 'new_message' and 'message_updated'.`
      );
      socket.off("new_message", handleNewMessage);
      socket.off("message_updated", handleMessageUpdated); // Remove listener for updates

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

      console.log("[fetchMessages] Raw messages from API:", response.data);

      // Process messages to ensure ID mapping AND correct timestamp
      const processedMessages = (response.data || []).map((msg: any) => {
        // Process reactions to ensure counts are properly set
        const processedReactions = (msg.reactions || []).map((r: any) => {
          // Ensure users array is valid
          const users = Array.isArray(r.users) ? r.users : [];
          return {
            ...r,
            emoji: r.emoji,
            // Always set count based on users array length
            count: users.length,
            users: users.map((u: any) => u?.toString()),
          };
        });

        return {
          ...msg,
          id: msg._id || msg.id,
          sender: msg.sender
            ? {
                // Process sender
                ...msg.sender,
                id: msg.sender._id || msg.sender.id,
              }
            : null, // Handle cases where sender might be null
          // Ensure timestamp is a Date object, using createdAt as primary source
          timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date(),
          // Use processed reactions with counts
          reactions: processedReactions,
        };
      });

      console.log(
        "[fetchMessages] Processed messages with reaction counts:",
        processedMessages.map((m) => ({
          id: m.id,
          reactions: m.reactions.map((r) => ({
            emoji: r.emoji,
            count: r.count,
          })),
        }))
      );

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

  // Update the sendMessage function in ChatContext to handle attachments properly
  const sendMessage = async (content: string, attachments: File[] = []) => {
    if (!activeChannel || !user) return;

    // 1. Create a temporary message object for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    // Create temporary attachments for optimistic UI update
    const tempAttachments = attachments.map((file) => ({
      id: `temp-${Math.random().toString(36).substring(2, 9)}`,
      type: file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("audio/")
        ? "audio"
        : "file",
      url: URL.createObjectURL(file), // Create temporary URL for preview
      name: file.name,
      size: file.size,
    })) as Attachment[];

    const optimisticMessage: Message = {
      id: tempId, // Temporary ID
      text: content,
      sender: user, // Use the current logged-in user as the sender
      timestamp: new Date(),
      channelId: activeChannel.id,
      attachments: tempAttachments,
      reactions: [],
      isEdited: false,
      replyTo: activeReplyTo || undefined, // Include reply reference if exists
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
      // Clear the active reply after sending
      setActiveReplyTo(null);

      // DEBUG: Log the data being sent
      console.log("[sendMessage] Sending message with:", {
        text: content,
        channelId: activeChannel.id,
        attachments:
          attachments.length > 0 ? `${attachments.length} files` : "none",
        replyToId: activeReplyTo?.id,
      });

      let savedMessageData;

      // Handle file uploads if there are attachments
      if (attachments.length > 0) {
        try {
          // Pass the user's actual message text instead of using default "Attachments"
          const uploadResponse = await uploadFiles(
            attachments,
            activeChannel.id,
            content,
            activeReplyTo?.id
          );
          console.log(
            "[sendMessage] Files uploaded successfully:",
            uploadResponse
          );

          // The uploadFiles response already contains the complete message
          // So we'll use this directly instead of creating another message
          savedMessageData = uploadResponse;
        } catch (uploadError) {
          console.error("[sendMessage] Error uploading files:", uploadError);
          throw new Error("Failed to upload files. Please try again.");
        }
      } else {
        // For text-only messages, use the regular API
        const apiResponse = await messageApi.sendMessage({
          text: content,
          channelId: activeChannel.id,
          replyToId: activeReplyTo?.id,
        });

        savedMessageData = apiResponse.data;
      }

      // Process the saved message data to ensure ID mapping and correct structure
      const processedSavedMessage: Message = {
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
        ),
        channelId: savedMessageData.channelId || activeChannel.id,
        attachments: savedMessageData.attachments || [],
        reactions: savedMessageData.reactions || [],
        isEdited: savedMessageData.isEdited || false,
        replyTo: savedMessageData.replyTo
          ? {
              // Process the replyTo message if it exists
              ...savedMessageData.replyTo,
              id: savedMessageData.replyTo._id || savedMessageData.replyTo.id,
              // Process the replyTo sender if it exists
              sender: savedMessageData.replyTo.sender
                ? {
                    ...savedMessageData.replyTo.sender,
                    id:
                      savedMessageData.replyTo.sender._id ||
                      savedMessageData.replyTo.sender.id,
                  }
                : undefined,
            }
          : undefined,
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

      // Clean up temporary object URLs
      tempAttachments.forEach((attachment) => {
        if (attachment.url && attachment.url.startsWith("blob:")) {
          URL.revokeObjectURL(attachment.url);
        }
      });
    } catch (err: any) {
      setError(err.message || "Failed to send message");
      console.error("Error sending message:", err);

      // 5. Remove the optimistic message if the API call failed
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));

      // Clean up temporary object URLs
      tempAttachments.forEach((attachment) => {
        if (attachment.url && attachment.url.startsWith("blob:")) {
          URL.revokeObjectURL(attachment.url);
        }
      });

      // Revert optimistic channel update on failure
      setChannels((prevChannels) =>
        prevChannels.map((channel) => {
          if (channel.id === activeChannel.id) {
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
    if (!user || !activeChannel) return;
    const originalMessages = [...messages]; // Store original state for potential revert

    console.log(
      `[reactToMessage] Reacting to message ${messageId} with emoji ${emoji}`
    );

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const updatedReactions = [...(m.reactions || [])];
        const reactionIndex = updatedReactions.findIndex(
          (r) => r.emoji === emoji
        );
        const userIdString = user.id; // Ensure we use the string ID

        if (reactionIndex > -1) {
          // Emoji exists
          const userIndex = updatedReactions[reactionIndex].users.findIndex(
            (id) => id === userIdString
          );
          if (userIndex > -1) {
            // User reacted, remove user (toggle off)
            updatedReactions[reactionIndex].users.splice(userIndex, 1);
            // Remove reaction if no users left
            if (updatedReactions[reactionIndex].users.length === 0) {
              updatedReactions.splice(reactionIndex, 1);
            }
          } else {
            // User hasn't reacted, add user
            updatedReactions[reactionIndex].users.push(userIdString);
          }
        } else {
          // Emoji doesn't exist, add new reaction
          updatedReactions.push({ emoji, count: 1, users: [userIdString] });
        }
        // Update/ensure count based on users array length
        updatedReactions.forEach((r) => {
          r.count = r.users.length;
        });

        console.log(
          `[reactToMessage] Optimistic update reactions:`,
          updatedReactions.map((r) => ({ emoji: r.emoji, count: r.count }))
        );
        return { ...m, reactions: updatedReactions };
      })
    );

    try {
      // Call the updated API function
      const { reactions: updatedServerReactions } = await apiReactToMessage(
        messageId,
        emoji
      );

      console.log(
        `[reactToMessage] Server returned reactions:`,
        updatedServerReactions
      );

      // Ensure each reaction has a correct count based on users array
      const processedReactions = updatedServerReactions.map((r) => {
        // Make sure we have a valid users array
        const users = Array.isArray(r.users) ? r.users : [];
        // Calculate count based on users array length
        const count = users.length;

        return {
          ...r,
          count: count,
          users: users.map((u) => u?.toString() || u), // Ensure all user IDs are strings
        };
      });

      console.log(
        `[reactToMessage] Processed server reactions:`,
        processedReactions.map((r) => ({ emoji: r.emoji, count: r.count }))
      );

      // Update state with server response (more robust than relying purely on optimistic)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                reactions: processedReactions,
              } // Use processed server data
            : m
        )
      );
    } catch (err) {
      console.error("React to message error in context:", err);
      sonnerToast.error("Failed to update reaction");
      // Revert optimistic update on error
      setMessages(originalMessages);
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

      // If it's a direct message, first check if there's an existing channel with this recipient
      if (isDirect && recipient) {
        // Look for an existing direct message channel with this recipient
        const existingChannel = channels.find(
          (c) =>
            c.type === "direct" &&
            c.members.some((m: any) => {
              // Check if member has the same ID as the recipient
              const memberId = m.id || m.userId;
              return memberId === recipient.id;
            })
        );

        if (existingChannel) {
          // If found, set it as active and return it instead of creating a new one
          setActiveChannel(existingChannel);

          // Ensure messages are fetched for this channel
          if (existingChannel.id) {
            await fetchMessages(existingChannel.id);
          }

          sonnerToast.success(`Opened conversation with ${recipient.username}`);
          return existingChannel;
        }
      }

      // Create channel via API
      const newCh = await apiCreateChannel(
        channelName!,
        selectedUsers,
        isPrivate,
        isDirect
      );

      // For local display, create a properly formatted channel object
      // Use type assertion to bypass TypeScript's strict typing
      const processed = {
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
      } as any as Channel;

      // Ensure we don't add duplicate channels
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

  // Create context value with the additional replyTo state and functions
  const contextValue = {
    channels,
    activeChannel,
    messages,
    loading,
    error,
    setActiveChannel: handleSetActiveChannel,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    createChannel,
    currentlyEditingId,
    setCurrentlyEditingId,
    activeReplyTo,
    setActiveReplyTo,
  };

  const memoizedContextValue = useMemo(
    () => contextValue,
    [
      channels,
      activeChannel,
      messages,
      loading,
      error,
      currentlyEditingId,
      activeReplyTo,
    ]
  );

  return (
    <ChatContext.Provider value={memoizedContextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
};
