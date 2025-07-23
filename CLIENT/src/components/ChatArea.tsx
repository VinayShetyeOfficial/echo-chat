"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { ChatMessage } from "./ChatMessage";
import { MessageInput } from "./MessageInput";
import type { Message } from "../types";
import { UserPlus, Loader2 } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (text: string, attachments?: File[]) => void;
  onEditMessage: (id: string, text: string) => void;
  onDeleteMessage: (id: string) => void;
}

export function ChatArea({
  messages,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
}: ChatAreaProps) {
  const {
    activeReplyTo,
    setActiveReplyTo,
    channelSwitchLoading,
    activeChannel,
    saveScrollPosition,
    getScrollPosition,
  } = useChat();

  const { user } = useAuth();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [initialScrollRestored, setInitialScrollRestored] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  // Show content after properly positioning the scroll
  useEffect(() => {
    // Short delay to ensure DOM is ready
    const timer = setTimeout(() => {
      setContentVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [activeChannel?.id]);

  // Use useLayoutEffect to position the scroll before painting
  // This ensures we never see the scroll movement
  useLayoutEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      // Immediately set scroll to bottom without animation
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
      setInitialScrollRestored(true);
    }
  }, [activeChannel?.id, messages]);

  // Check if user has scrolled up
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;

      // Save current scroll position
      if (activeChannel?.id) {
        saveScrollPosition(activeChannel.id, scrollTop);
      }

      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
      setShowScrollToBottom(isScrolledUp);
    }
  }, [activeChannel?.id, saveScrollPosition, setShowScrollToBottom]);

  // Effect for restoring scroll position when switching channels
  useEffect(() => {
    if (!activeChannel?.id || !messagesContainerRef.current) {
      return;
    }

    // After channel switch loading is complete and we have messages
    if (!channelSwitchLoading && messages.length > 0) {
      // Immediately scroll to the bottom on channel change
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [activeChannel?.id, channelSwitchLoading, messages.length]);

  // Initialize scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  const scrollToBottom = (smooth = true) => {
    if (!messagesEndRef.current) return;

    if (smooth) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    } else {
      // Use instant scrolling (no animation)
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }

    setShowScrollToBottom(false);
  };

  // Handle new message - only auto-scroll if we're already at bottom
  useEffect(() => {
    if (initialScrollRestored && messages.length > 0 && !channelSwitchLoading) {
      const container = messagesContainerRef.current;
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

        if (isAtBottom) {
          scrollToBottom(true);
        }
      }
    }
  }, [messages, channelSwitchLoading, initialScrollRestored]);

  const handleReply = (message: Message) => {
    // Ensure the sender is a full user object
    setActiveReplyTo({
      ...message,
      sender:
        message.sender && message.sender.username
          ? message.sender
          : {
              id: message.sender?.id || "",
              username: message.sender?.username || "Unknown User",
              email: "",
              isOnline: false,
            },
    });
  };

  const handleSendMessage = (text: string, attachments?: File[]) => {
    onSendMessage(text, attachments);
  };

  const getSimplifiedReply = () => {
    if (!activeReplyTo) return null;
    return {
      id: activeReplyTo.id,
      text: activeReplyTo.text,
      sender:
        activeReplyTo.sender.id === user?.id
          ? "You"
          : activeReplyTo.sender.username,
    };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-900">
      <div
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto p-4 custom-scrollbar space-y-1 relative ${
          contentVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{ transition: "opacity 150ms ease-out" }}
      >
        {/* Channel switching loading indicator */}
        {channelSwitchLoading && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-black/70 text-white px-3 py-2 rounded-full flex items-center space-x-2 text-sm shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading messages...</span>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No messages yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Start the conversation by sending a message below. You can
                invite others from the sidebar.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={`${message.id}-${message.timestamp.getTime()}`}
                message={message}
                onReply={handleReply}
              />
            ))}
            {/* Extra padding div to ensure enough space at bottom for UI elements like emoji picker */}
            <div className="h-36 w-full" aria-hidden="true"></div>
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showScrollToBottom && (
        <button
          className="absolute bottom-[5.58rem] right-6 z-10 bg-chat-primary text-white p-2 rounded-full shadow-md hover:bg-chat-primary/90 transition-colors"
          onClick={() => scrollToBottom(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      )}

      <MessageInput
        onSendMessage={handleSendMessage}
        replyTo={getSimplifiedReply()}
        onCancelReply={() => setActiveReplyTo(undefined)}
      />
    </div>
  );
}
