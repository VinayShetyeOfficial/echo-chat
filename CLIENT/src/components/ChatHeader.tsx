import React, { useMemo } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "./UserAvatar";
import { Channel, User } from "@/types";

export function ChatHeader() {
  const { activeChannel } = useChat();
  const { user } = useAuth();

  // Use a comprehensive and safer approach to find the recipient
  const recipient = useMemo(() => {
    if (!activeChannel || activeChannel.type !== "direct" || !user) {
      return null;
    }

    try {
      // Cast members to any[] to avoid TypeScript errors
      const members = activeChannel.members as any[];

      // Find the member that's not the current user
      const otherMember = members.find((member) => {
        if (!member) return false;

        // If it has userId property (ChannelMember)
        if (member.userId && member.userId !== user.id) {
          return true;
        }

        // If it's a User object with id
        if (member.id && member.id !== user.id) {
          return true;
        }

        return false;
      });

      if (otherMember) {
        // Case 1: Member has a user property with user data
        if (otherMember.user && otherMember.user.username) {
          return otherMember.user;
        }

        // Case 2: Member is a User object directly
        if (otherMember.username) {
          return otherMember;
        }
      }
    } catch (error) {
      console.error("Error finding recipient in ChatHeader:", error);
    }

    return null;
  }, [activeChannel, user]);

  if (!activeChannel) {
    return null;
  }

  // Calculate display name based on recipient or channel name
  let displayName: string;
  let prefix = "";

  if (activeChannel.type === "direct") {
    if (recipient && recipient.username) {
      displayName = recipient.username;
    } else if (activeChannel.name) {
      displayName = activeChannel.name;
    } else {
      displayName = "Unknown User";
      prefix = "#"; // Add hash to unknown users to indicate it's a system default
    }
  } else {
    // For group channels
    displayName = activeChannel.name || "Unnamed Channel";
    prefix = "#";
  }

  // Get online status from recipient if available, with fallback
  const onlineStatus = recipient
    ? recipient.isOnline
      ? "Online"
      : "Offline"
    : "Offline";

  return (
    <div className="flex items-center gap-3 p-4 border-b">
      {activeChannel.type === "direct" ? (
        <UserAvatar user={recipient} size="md" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chat-primary/10 text-chat-primary">
          #
        </div>
      )}
      <div className="flex flex-col">
        <span className="font-semibold">
          {prefix}
          {displayName}
        </span>
        {activeChannel.type === "direct" && (
          <span className="text-sm text-muted-foreground text-left">
            {onlineStatus}
          </span>
        )}
      </div>
    </div>
  );
}
