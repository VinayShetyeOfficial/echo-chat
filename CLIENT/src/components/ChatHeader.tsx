import React, { useMemo } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "./UserAvatar";
import { Channel, User } from "@/types";

export function ChatHeader() {
  const { activeChannel } = useChat();
  const { user } = useAuth();

  // First define proper typeguards
  const isUserObject = (obj: any): obj is User =>
    obj && typeof obj === "object" && "username" in obj;

  const isChannelMemberWithUser = (
    obj: any
  ): obj is { user: User; userId: string } =>
    obj && typeof obj === "object" && "userId" in obj && "user" in obj;

  // Use a more comprehensive useMemo to calculate the recipient
  const recipient = useMemo(() => {
    if (activeChannel?.type !== "direct" || !user) {
      return null;
    }

    // Find the other member (not the current user)
    const otherMember = activeChannel.members.find((member) => {
      // If it's a User object directly
      if (isUserObject(member)) {
        return member.id !== user.id;
      }

      // If it's a ChannelMember with userId
      if (isChannelMemberWithUser(member)) {
        return member.userId !== user.id;
      }

      return false;
    });

    // Extract and return the user object from the found member
    if (otherMember) {
      if (isChannelMemberWithUser(otherMember)) {
        // Get the user from the user property
        return otherMember.user;
      } else if (isUserObject(otherMember)) {
        // It's already a User object
        return otherMember;
      }
    }

    return null;
  }, [activeChannel?.members, activeChannel?.type, user?.id]);

  if (!activeChannel) {
    return null;
  }

  // Calculate display name based on recipient or channel name
  let displayName: string;

  if (activeChannel.type === "direct" && recipient) {
    // Use recipient username if available
    displayName = recipient.username || activeChannel.name || "Unknown User";
  } else {
    // For group channels
    displayName = `#${activeChannel.name || "Unnamed Channel"}`;
  }

  const onlineStatus = recipient?.isOnline ? "Online" : "Offline";

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
        <span className="font-semibold">{displayName}</span>
        {activeChannel.type === "direct" && (
          <span className="text-sm text-muted-foreground text-left">
            {onlineStatus}
          </span>
        )}
      </div>
    </div>
  );
}
