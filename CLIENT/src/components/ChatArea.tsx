"use client"

import { useState, useRef, useEffect } from "react"
import { ChatMessage } from "./ChatMessage"
import { MessageInput } from "./MessageInput"
import type { Message } from "../types"
import { UserPlus } from "lucide-react"
import { useChat } from "@/contexts/ChatContext"

interface ChatAreaProps {
  messages: Message[]
  onSendMessage: (text: string, attachments?: File[]) => void
  onEditMessage: (id: string, text: string) => void
  onDeleteMessage: (id: string) => void
}

export function ChatArea({ messages, onSendMessage, onEditMessage, onDeleteMessage }: ChatAreaProps) {
  // Use context instead of local state for reply functionality
  const { activeReplyTo, setActiveReplyTo } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  // Check if user has scrolled up
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100
      setShowScrollToBottom(isScrolledUp)
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
      return () => container.removeEventListener("scroll", handleScroll)
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    setShowScrollToBottom(false)
  }

  const handleReply = (message: Message) => {
    // Store the full message object to ensure we have all the data we need
    setActiveReplyTo(message)
  }

  const handleSendMessage = (text: string, attachments?: File[]) => {
    // Pass the message text to onSendMessage (the actual sending happens in ChatContext)
    onSendMessage(text, attachments)
    // Context's setActiveReplyTo will be called in the sendMessage function
    // to reset after sending
  }

  // Create a simplified version of the message for the MessageInput component
  const getSimplifiedReply = () => {
    if (!activeReplyTo) return null

    return {
      id: activeReplyTo.id,
      text: activeReplyTo.text,
      sender: activeReplyTo.sender.username,
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-900">
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No messages yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Start the conversation by sending a message below. You can invite others from the sidebar.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} onReply={handleReply} />
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
          onClick={scrollToBottom}
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
  )
}
