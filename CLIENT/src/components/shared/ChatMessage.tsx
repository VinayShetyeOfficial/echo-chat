import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Message, Reaction } from "@/types"; // Import Message and Reaction types
import Picker from "@emoji-mart/react"; // Import Picker
import data from "@emoji-mart/data"; // Import data
import { UserAvatar } from "@/components/UserAvatar"; // Ensure this path is correct
import { cn } from "@/lib/utils"; // Import cn utility
import { Smile, Reply, MoreHorizontal } from "lucide-react"; // Import icons
import { format } from "date-fns"; // Import date-fns for timestamp formatting

// Define ChatMessageProps interface
interface ChatMessageProps {
  message: Message;
}

// Use the defined interface
const ChatMessage = ({ message }: ChatMessageProps) => {
  const { reactToMessage } = useChat(); // Remove unused setEditingMessage
  const { user } = useAuth();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isHovering, setIsHovering] = useState(false); // State for hover

  // Correctly type the emoji parameter
  const handleReact = (emoji: { native: string }) => {
    if (!message || !message.id) return;
    reactToMessage(message.id, emoji.native);
    setShowEmojiPicker(false);
  };

  const isOwnMessage = message.sender.id === user?.id;

  return (
    <div
      className={cn(
        "flex items-start space-x-3 group py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-800/50",
        isOwnMessage ? "justify-end" : ""
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {!isOwnMessage && (
        // Add UserAvatar for sender (showStatus defaults to false)
        <UserAvatar user={message.sender} className="w-8 h-8 mt-1" />
      )}
      <div
        className={cn(
          "flex flex-col",
          isOwnMessage ? "items-end" : "items-start"
        )}
      >
        <div className="flex items-center space-x-2">
          {/* Sender Name */}
          {!isOwnMessage && (
            <span className="font-semibold text-sm">
              {message.sender.username}
            </span>
          )}
          {/* Timestamp */}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {format(new Date(message.timestamp), "p")} {/* Format timestamp */}
          </span>
        </div>
        {/* Message Text */}
        <div
          className={cn(
            "p-2 rounded-lg max-w-xs md:max-w-md lg:max-w-lg break-words whitespace-normal relative", // Use break-words without break-all
            isOwnMessage
              ? "bg-blue-500 text-white"
              : "bg-gray-200 dark:bg-gray-700"
          )}
        >
          {message.text}

          {/* Emoji Picker Logic */}
          {showEmojiPicker && (
            <div
              className={cn(
                "absolute z-10",
                isOwnMessage
                  ? "bottom-full right-0 mb-1"
                  : "bottom-full left-0 mb-1" // Position picker based on sender
              )}
            >
              <Picker
                data={data}
                onEmojiSelect={handleReact}
                theme={
                  document.documentElement.classList.contains("dark")
                    ? "dark"
                    : "light"
                }
              />
            </div>
          )}
        </div>

        {/* Display Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex items-center space-x-1 mt-1">
            {message.reactions.map(
              (
                reaction: Reaction // Use imported Reaction type
              ) => (
                <span
                  key={reaction.emoji}
                  className="text-xs bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5 cursor-pointer flex items-center"
                  // Check if current user reacted before calling handleReact (toggle logic needed server-side)
                  onClick={() => handleReact({ native: reaction.emoji })}
                >
                  {reaction.emoji}
                  {/* Always display count, even when it's 1 */}
                  <span className="ml-1">{reaction.count}</span>
                </span>
              )
            )}
            {/* Conditionally show add reaction button if not reacting */}
            {isHovering && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering row hover effects
                  setShowEmojiPicker(true);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs rounded-full p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600"
                aria-label="Add reaction"
              >
                <Smile size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hover Actions */}
      {isHovering && (
        <div
          className={cn(
            "absolute top-0 flex items-center space-x-1 p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md",
            isOwnMessage
              ? "left-0 -translate-x-full ml-[-8px]"
              : "right-0 translate-x-full mr-[-8px]",
            "mt-[-10px]" // Adjust vertical position slightly above the message row
          )}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEmojiPicker(true);
            }}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="React"
          >
            <Smile size={16} />
          </button>
          {/* Add Reply and More buttons later if needed */}
          {/* <button className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Reply">
             <Reply size={16} />
          </button>
          <button className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="More options">
             <MoreHorizontal size={16} />
          </button> */}
        </div>
      )}

      {isOwnMessage && (
        // Add UserAvatar for own message
        <UserAvatar user={user} className="w-8 h-8 mt-1" />
      )}
    </div>
  );
};

export default ChatMessage;
