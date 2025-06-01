"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { MessageInput } from "./MessageInput";
import type { Message } from "../types";
import { UserPlus, Loader2 } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";

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
  // Use context instead of local state for reply functionality
  const {
    activeReplyTo,
    setActiveReplyTo,
    channelSwitchLoading,
    activeChannel,
    saveScrollPosition,
    getScrollPosition,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [initialScrollRestored, setInitialScrollRestored] = useState(false);

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
    if (
      !activeChannel?.id ||
      !messagesContainerRef.current ||
      channelSwitchLoading
    ) {
      return;
    }

    // After channel switch loading is complete
    if (
      !channelSwitchLoading &&
      messages.length > 0 &&
      !initialScrollRestored
    ) {
      // Get saved scroll position for this channel
      const savedPosition = getScrollPosition(activeChannel.id);

      // If we have a saved position, restore it
      if (savedPosition > 0) {
        messagesContainerRef.current.scrollTop = savedPosition;
        setInitialScrollRestored(true);
      } else {
        // If no saved position, scroll to bottom
        scrollToBottom(false);
        setInitialScrollRestored(true);
      }
    }
  }, [
    activeChannel?.id,
    channelSwitchLoading,
    messages.length,
    initialScrollRestored,
    getScrollPosition,
  ]);

  // Reset the initialScrollRestored flag when changing channels
  useEffect(() => {
    if (activeChannel?.id) {
      setInitialScrollRestored(false);
    }
  }, [activeChannel?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    // Don't scroll if we're in the process of restoring a scroll position
    if (initialScrollRestored) {
      if (messages.length > 0 && !channelSwitchLoading) {
        // Check if the user is already at the bottom
        const container = messagesContainerRef.current;
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container;
          const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

          // Only auto-scroll if user is already at the bottom
          if (isAtBottom) {
            scrollToBottom(true);
          }
        }
      }
    } else if (channelSwitchLoading || messages.length === 0) {
      // For channel switches or initial load, handle in the other useEffect
    } else {
      // For new messages in the same channel, use smooth scrolling
      scrollToBottom(true);
    }
  }, [messages, channelSwitchLoading, initialScrollRestored]);

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

  const handleReply = (message: Message) => {
    // Store the full message object to ensure we have all the data we need
    setActiveReplyTo(message);
  };

  const handleSendMessage = (text: string, attachments?: File[]) => {
    // Pass the message text to onSendMessage (the actual sending happens in ChatContext)
    onSendMessage(text, attachments);
    // Context's setActiveReplyTo will be called in the sendMessage function
    // to reset after sending
  };

  // Create a simplified version of the message for the MessageInput component
  const getSimplifiedReply = () => {
    if (!activeReplyTo) return null;

    return {
      id: activeReplyTo.id,
      text: activeReplyTo.text,
      sender: activeReplyTo.sender.username,
    };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-900">
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-1 relative"
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
                key={message.id}
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
