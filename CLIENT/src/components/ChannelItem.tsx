import React, { useMemo } from "react";
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

interface ChannelItemProps {
  channel: Channel;
  active: boolean;
  recipient?: User;
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
    recipient: propRecipient,
    onClick,
    onDeleteChat,
    onArchiveChat,
    onPinChat,
    onMuteChat,
    onMarkAsUnread,
  }) => {
    const { user: currentUser } = useAuth();

    const recipient = useMemo(() => {
      if (propRecipient) {
        return propRecipient;
      }

      if (channel.type === "direct" && currentUser) {
        const members = channel.members as any[];

        const otherMember = members.find((member) => {
          if (!member) return false;
          return (
            (member.id && member.id !== currentUser.id) ||
            (member.userId && member.userId !== currentUser.id)
          );
        });

        if (otherMember) {
          if (otherMember.user) return otherMember.user;
          if (otherMember.username) return otherMember;
        }
      }
      return null;
    }, [channel.members, channel.type, currentUser?.id, propRecipient]);

    let name: string =
      channel.type === "direct"
        ? recipient?.username || channel.name || "Unknown User"
        : `#${channel.name || "Unnamed Channel"}`;

    const { lastMsg, lastMessageDate } = useMemo(() => {
      let formattedMsg = "No messages yet";
      let msgDate = null;
      const lastMessage = channel.lastMessage;

      if (lastMessage) {
        const messageText = lastMessage.text || "";
        const messageSender = lastMessage.sender;
        const messageTimestamp = lastMessage.timestamp
          ? new Date(lastMessage.timestamp)
          : null;

        const plainMessageText = messageText
          .replace(/([*_~`])(.*?)\1/g, "$2")
          .replace(/[*_~`]/g, "");

        const isCurrentUserSender =
          currentUser && messageSender && messageSender.id === currentUser.id;

        if (plainMessageText) {
          formattedMsg = isCurrentUserSender
            ? `You: ${plainMessageText}`
            : plainMessageText;
        } else if (
          lastMessage.attachments &&
          lastMessage.attachments.length > 0
        ) {
          const attachmentType = lastMessage.attachments[0].type || "file";
          formattedMsg = isCurrentUserSender
            ? `You sent an ${attachmentType}`
            : `${
                recipient?.username || messageSender?.username || "Someone"
              } sent an ${attachmentType}`;
        } else {
          formattedMsg = "Empty message";
        }

        if (messageTimestamp) {
          msgDate = format(messageTimestamp, "h:mm a");
        }
      }

      return {
        lastMsg: formattedMsg,
        lastMessageDate: msgDate,
      };
    }, [channel.lastMessage, currentUser?.id]);

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
          <span
            className="text-xs text-muted-foreground truncate text-left w-full"
            title={lastMsg}
          >
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
                className="h-7 w-7 p-0 ml-1 hover:bg-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
