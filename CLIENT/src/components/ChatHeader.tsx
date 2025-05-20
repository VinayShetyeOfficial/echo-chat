"use client";

import { useMemo, useState } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "./UserAvatar";
import { useSettings } from "@/contexts/SettingsContext";
import { SettingsDialog } from "./SettingsDialog";

interface ChatHeaderProps {
  onToggleSidebar?: () => void; // Make optional
  channel?: any; // Add channel
  onSearchMessages?: (query: string) => void; // Add search function
  onToggleMobileMenu?: () => void; // Add mobile menu toggle
}

export function ChatHeader({
  onToggleSidebar,
  channel,
  onSearchMessages,
  onToggleMobileMenu,
}: ChatHeaderProps) {
  const { activeChannel } = useChat();
  // Use provided channel or activeChannel from context
  const currentChannel = channel || activeChannel;
  const { user } = useAuth();
  const settings = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Use a comprehensive and safer approach to find the recipient
  const recipient = useMemo(() => {
    if (!currentChannel || currentChannel.type !== "direct" || !user) {
      return null;
    }

    try {
      // Cast members to any[] to avoid TypeScript errors
      const members = currentChannel.members as any[];

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
  }, [currentChannel, user]);

  if (!currentChannel) {
    return null;
  }

  // Calculate display name based on recipient or channel name
  let displayName: string;
  let prefix = "";

  if (currentChannel.type === "direct") {
    if (recipient && recipient.username) {
      displayName = recipient.username;
    } else if (currentChannel.name) {
      displayName = currentChannel.name;
    } else {
      displayName = "Unknown User";
      prefix = "#"; // Add hash to unknown users to indicate it's a system default
    }
  } else {
    // For group channels
    displayName = currentChannel.name || "Unnamed Channel";
    prefix = "#";
  }

  // Get online status from recipient if available, with fallback
  const onlineStatus = recipient
    ? recipient.isOnline
      ? "Online"
      : "Offline"
    : "Offline";

  return (
    <div className="flex items-center gap-3 p-4 border-b h-16">
      {currentChannel.type === "direct" ? (
        <UserAvatar user={recipient} size="md" showStatus={true} />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chat-primary/10 text-chat-primary">
          #
        </div>
      )}
      <div className="flex flex-col justify-center min-h-[40px]">
        <span className="font-semibold">
          {prefix}
          {displayName}
        </span>
        {currentChannel.type === "direct" ? (
          <span className="text-sm text-muted-foreground text-left">
            {onlineStatus}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground text-left opacity-0">
            {/* Hidden placeholder for consistent height */}
            &nbsp;
          </span>
        )}
      </div>

      {/* --- TEST BUTTON START --- */}
      {/*
      <Button
        variant="outline"
        size="sm"
        className="absolute top-2 right-20 z-10"
        onClick={async () => {
          const testMessageId = "67f8b5f78302ef0e0aa2f687"; // Replace with a valid message ID from your DB
          if (!testMessageId) {
            console.error("Test Error: Please provide a valid message ID");
            return;
          }
          try {
            console.log(`Testing GET /api/messages/${testMessageId}`);
            // Temporarily bypass fetchApi/apiClient for direct fetch test
            const token = localStorage.getItem("token");
            const response = await fetch(
              `http://localhost:3001/api/messages/${testMessageId}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            const data = await response.json();
            if (!response.ok) {
              throw new Error(
                `Test failed with status ${response.status}: ${JSON.stringify(
                  data
                )}`
              );
            }
            console.log("Test GET Response:", data);
            alert("Test GET request successful! Check console.");
          } catch (error) {
            console.error("Test GET Request Error:", error);
            alert("Test GET request FAILED! Check console.");
          }
        }}
      >
        Test GET Message Route
      </Button>
      */}
      {/* --- TEST BUTTON END --- */}

      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
