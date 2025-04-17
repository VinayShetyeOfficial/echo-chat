import React, { useMemo, useEffect } from "react";
import { Channel, User } from "@/types";
import { UserAvatar } from "./UserAvatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { MoreVertical, Archive, BellOff, Pin, Mail, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { debugCurrentUser } from "@/lib/auth";

interface ChannelItemProps {
  channel: Channel;
  active: boolean;
  onClick: () => void;
  onDeleteChat?: (channelId: string) => void;
  onArchiveChat?: (channelId: string) => void;
  onPinChat?: (channelId: string) => void;
  onMuteChat?: (channelId: string) => void;
  onMarkAsUnread?: (channelId: string) => void;
}

const ChannelItem: React.FC<ChannelItemProps> = React.memo(
  ({
    channel,
    active,
    onClick,
    onDeleteChat,
    onArchiveChat,
    onPinChat,
    onMuteChat,
    onMarkAsUnread,
  }) => {
    const { user: currentUser } = useAuth();

    const recipient = useMemo(() => {
      if (channel.type === "direct" && currentUser) {
        const otherUser = channel.members.find(
          (member) => member.id !== currentUser.id
        );
        return otherUser || null;
      }
      return null;
    }, [channel.members, channel.type, currentUser?.id]);

    useEffect(() => {
      if (channel.lastMessage) {
        console.log(
          `CHANNEL ITEM [${channel.name}] - Current AuthContext User:`,
          currentUser
            ? { id: currentUser.id, username: currentUser.username }
            : "None"
        );
        debugCurrentUser();
      }
    }, [channel.name, channel.lastMessage, currentUser]);

    let name: string = "";

    if (channel.type === "direct") {
      if (
        recipient &&
        typeof recipient === "object" &&
        "username" in recipient
      ) {
        name = recipient.username as string;
      } else if (channel.name) {
        name = channel.name;
      } else {
        name = "Unknown User";
      }
    } else {
      name = `#${channel.name || "Unnamed Channel"}`;
    }

    const { lastMsg, lastMessageDate } = useMemo(() => {
      let formattedMsg = "No messages yet";
      let msgDate = null;

      if (channel.lastMessage) {
        const messageText =
          channel.lastMessage.text ||
          (channel.lastMessage as any).content ||
          "";

        const messageSender =
          channel.lastMessage.sender || (channel.lastMessage as any).user;

        let storedUserId = null;
        try {
          const storedUser = localStorage.getItem("currentUser");
          if (storedUser) {
            const userObj = JSON.parse(storedUser);
            storedUserId = userObj?.id;
          }
        } catch (e) {
          console.error("Error parsing user from localStorage:", e);
        }

        const isCurrentUserSender =
          currentUser &&
          (String(messageSender?.id) === String(currentUser.id) ||
            messageSender?.username === currentUser.username);

        if (messageSender) {
          if (isCurrentUserSender) {
            formattedMsg = `You: ${messageText}`;
          } else if (channel.type === "direct") {
            formattedMsg = messageText;
          } else if (messageSender.username) {
            formattedMsg = `${messageSender.username}: ${messageText}`;
          } else {
            formattedMsg = messageText;
          }
        } else {
          formattedMsg = messageText;
        }

        if (channel.lastMessage.timestamp) {
          msgDate = format(new Date(channel.lastMessage.timestamp), "h:mm a");
        }
      }

      return {
        lastMsg: formattedMsg,
        lastMessageDate: msgDate,
      };
    }, [
      channel.lastMessage,
      currentUser,
      channel.type,
      channel.id,
      channel.name,
    ]);

    return (
      <div
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/80 transition-colors",
          active && "bg-muted/50"
        )}
      >
        {channel.type === "direct" ? (
          <UserAvatar user={recipient} size="sm" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-chat-primary/10 text-chat-primary">
            #
          </div>
        )}
        <div className="flex flex-col truncate flex-1">
          <span className="truncate font-medium text-left">{name}</span>
          <span className="text-xs text-muted-foreground truncate text-left w-full">
            {lastMsg}
          </span>
        </div>
        <div className="flex items-center ml-auto shrink-0">
          {lastMessageDate && (
            <span className="text-xs text-muted-foreground ml-2 shrink-0">
              {lastMessageDate}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 ml-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-[200px] bg-background"
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onArchiveChat?.(channel.id);
                }}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive chat
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onMuteChat?.(channel.id);
                }}
              >
                <BellOff className="h-4 w-4 mr-2" />
                Mute notifications
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onPinChat?.(channel.id);
                }}
              >
                <Pin className="h-4 w-4 mr-2" />
                Pin chat
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsUnread?.(channel.id);
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Mark as unread
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat?.(channel.id);
                }}
                className="text-destructive"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }
);

export default ChannelItem;
