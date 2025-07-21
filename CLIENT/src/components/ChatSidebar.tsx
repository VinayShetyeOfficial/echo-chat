"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  X,
  Settings,
  Search as SearchIcon,
  UserPlus,
  Hash,
  MessageSquare,
  LogOut,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import ChannelItem from "./ChannelItem";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { UserAvatar } from "./UserAvatar";
import type { Channel, User } from "@/types";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "./SettingsDialog";
import { useToast } from "@/components/ui/use-toast";
import { InviteButton } from "./InviteButton";

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onCreateChannel: (type: "group" | "direct") => void;
}

export function ChatSidebar({
  isOpen,
  onToggle,
  onCreateChannel,
}: ChatSidebarProps) {
  const { user, logout } = useAuth();
  const { channels, activeChannel, setActiveChannel } = useChat();
  const { theme, setTheme } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "direct" | "groups">(
    "all"
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();
  const [recipient, setRecipient] = useState<User | null>(null);
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);

  useEffect(() => {
    if (activeChannel && activeChannel.type === "direct" && user) {
      // Cast the channel members to any[] to handle different member structures
      const members = activeChannel.members as any[];

      // For direct messages, find the other user
      const otherMember = members.find((member) => {
        if (!member) return false;

        // If member has a userId property (ChannelMember)
        if (member.userId && member.userId !== user.id) return true;

        // If member is a User object
        if (member.id && member.id !== user.id) return true;

        return false;
      });

      // Get the user from the member object, handling different structures
      let otherUser = null;
      if (otherMember) {
        if (otherMember.user && otherMember.user.username) {
          // Case 1: Member has a user object
          otherUser = otherMember.user;
        } else if (otherMember.username) {
          // Case 2: Member is a User object
          otherUser = otherMember;
        }
      }

      setRecipient(otherUser);
    }
  }, [activeChannel?.id, user?.id]);

  // Deduplicate channels and get recipients for direct messages
  const processedChannels = channels.reduce(
    (acc: { channel: Channel; recipient?: User }[], channel) => {
      // Skip if channel is already processed
      if (acc.some((item) => item.channel.id === channel.id)) {
        return acc;
      }

      let recipient: User | undefined = undefined;

      if (channel.type === "direct" && user) {
        // Treat members as any[] to handle different structures
        const members = channel.members as any[];

        for (const member of members) {
          // Skip null or undefined members
          if (!member) continue;

          let found = false;

          // Case 1: Member has userId property (ChannelMember)
          if (member.userId && member.userId !== user.id) {
            if (member.user && member.user.username) {
              recipient = member.user;
              found = true;
            } else {
              // Log the proper userId, handling the case where it might be an object
              const userId =
                typeof member.userId === "object"
                  ? JSON.stringify(member.userId)
                  : member.userId;
              console.log(
                `Direct message: User details needed for ID: ${userId}`
              );
            }
          }
          // Case 2: Member is a User object
          else if (member.id && member.id !== user.id && member.username) {
            recipient = member;
            found = true;
          }

          if (found) break;
        }

        // Log appropriate message based on whether we found a recipient
        if (recipient && recipient.username) {
          console.log(
            `Direct message: Found recipient ${
              recipient.username
            } for channel ${channel.id || "new"}`
          );

          // Update channel name for direct messages
          channel = {
            ...channel,
            name: recipient.username,
          };
        } else {
          console.log(
            `Direct message: No valid recipient found for channel ${
              channel.id || "new"
            }, using fallback name: ${channel.name || "Unknown"}`
          );
        }
      }

      acc.push({ channel, recipient });
      return acc;
    },
    []
  );

  // Filter & sort logic
  const filteredChannels = processedChannels.filter((item) => {
    const nameLC = item.channel.name?.toLowerCase() || "";
    const searchLC = searchTerm.toLowerCase();
    return nameLC.includes(searchLC);
  });

  const sortedChannels = [...filteredChannels].sort((a, b) => {
    const dateA = new Date(
      a.channel.lastMessage?.timestamp || a.channel.createdAt || 0
    );
    const dateB = new Date(
      b.channel.lastMessage?.timestamp || b.channel.createdAt || 0
    );
    return dateB.getTime() - dateA.getTime();
  });

  // Tab filtering
  const visibleChannels = sortedChannels.filter((ch) => {
    if (activeTab === "all") return true;
    if (activeTab === "direct") return ch.channel.type === "direct";
    if (activeTab === "groups") return ch.channel.type === "group";
    return true;
  });

  const handleChannelClick = async (channel: Channel) => {
    await setActiveChannel(channel);
    onToggle(); // optional if you want to close sidebar on mobile
  };

  const handleDeleteChat = (channelId: string) => {
    toast({ title: "Delete not implemented", description: channelId });
  };
  const handleArchiveChat = (channelId: string) => {
    toast({ title: "Archive not implemented", description: channelId });
  };
  const handlePinChat = (channelId: string) => {
    toast({ title: "Pin not implemented", description: channelId });
  };
  const handleMuteChat = (channelId: string) => {
    toast({ title: "Mute not implemented", description: channelId });
  };
  const handleMarkAsUnread = (channelId: string) => {
    toast({ title: "Mark as unread not implemented", description: channelId });
  };

  // Use useMemo to reduce re-renders
  const channelList = useMemo(() => {
    return channels.map((channel) => (
      <ChannelItem
        key={channel.id}
        channel={channel}
        active={activeChannel?.id === channel.id}
        onClick={() => setActiveChannel(channel)}
      />
    ));
  }, [channels, activeChannel?.id, setActiveChannel]);

  const handleTabChange = (tab: "all" | "direct" | "groups") => {
    if (tab === activeTab) return;
    setIsTabTransitioning(true);
    setActiveTab(tab);
    // Reset the transitioning state after animation completes
    setTimeout(() => {
      setIsTabTransitioning(false);
    }, 400);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 flex h-full w-80 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 transition-transform duration-300 ease-in-out md:relative",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 h-16">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-chat-primary text-white">
              <MessageSquare className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-semibold">Echo Chat</h1>
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (theme === "dark") setTheme("light");
                      else if (theme === "light") setTheme("system");
                      else setTheme("dark");
                    }}
                  >
                    {theme === "dark" ? (
                      <Moon className="h-4 w-4" />
                    ) : theme === "light" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Monitor className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {theme === "dark"
                    ? "Switch to light mode"
                    : theme === "light"
                    ? "Switch to system theme"
                    : "Switch to dark mode"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              onClick={onToggle}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700 relative">
          <button
            onClick={() => handleTabChange("all")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium transition-colors relative",
              activeTab === "all"
                ? "text-chat-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          <button
            onClick={() => handleTabChange("direct")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium transition-colors relative",
              activeTab === "direct"
                ? "text-chat-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Direct
          </button>
          <button
            onClick={() => handleTabChange("groups")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium transition-colors relative",
              activeTab === "groups"
                ? "text-chat-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Groups
          </button>
          {/* Single animated indicator */}
          <div
            className="absolute bottom-0 h-[2px] bg-chat-primary transition-all duration-400 ease-out"
            style={{
              left:
                activeTab === "all"
                  ? "0%"
                  : activeTab === "direct"
                  ? "33.333%"
                  : "66.666%",
              width: "33.333%",
              transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: isTabTransitioning ? "scaleX(0.85)" : "scaleX(1)",
              opacity: isTabTransitioning ? 0.8 : 1,
              boxShadow: "0 0 2px rgba(124, 58, 237, 0.6)",
            }}
          />
        </div>

        {/* Buttons to create new direct or group channel */}
        <div className="flex flex-col gap-1.5 px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/20"
            onClick={() => onCreateChannel("group")}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/30">
              <Hash className="h-3.5 w-3.5" />
            </span>
            <span>New Channel</span>
            <Plus className="h-4 w-4 ml-auto" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/20"
            onClick={() => onCreateChannel("direct")}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/30">
              <UserPlus className="h-3.5 w-3.5" />
            </span>
            <span>New Direct Message</span>
            <Plus className="h-4 w-4 ml-auto" />
          </Button>
        </div>
        <Separator className="my-2" />

        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {visibleChannels.length === 0 ? (
            <div className="px-4 py-8 text-center flex flex-col items-center">
              <UserPlus className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm
                  ? "No conversations match your search."
                  : "No channels or messages yet."}
              </p>
              {!searchTerm && <InviteButton variant="secondary" size="sm" />}
            </div>
          ) : (
            visibleChannels.map(({ channel, recipient }) => (
              <ChannelItem
                key={`channel-${channel.id}`}
                channel={channel}
                recipient={recipient}
                active={activeChannel?.id === channel.id}
                onClick={() => handleChannelClick(channel)}
                onDeleteChat={handleDeleteChat}
                onArchiveChat={handleArchiveChat}
                onPinChat={handlePinChat}
                onMuteChat={handleMuteChat}
                onMarkAsUnread={handleMarkAsUnread}
              />
            ))
          )}
        </div>

        {/* Add user profile footer */}
        <div className="mt-auto border-t p-4">
          <div className="flex items-center gap-3">
            <UserAvatar user={user} showStatus={true} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-left">
                {user?.username || "Unknown User"}
              </p>
              <p className="text-xs text-muted-foreground truncate text-left">
                {user?.email || ""}
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      logout();
                      toast({
                        title: "Logged out",
                        description: "You have been logged out successfully.",
                      });
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Logout</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </aside>

      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
