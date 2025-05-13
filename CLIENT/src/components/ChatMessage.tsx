"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { UserAvatar } from "./UserAvatar";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2,
  SmilePlus,
  Check,
  X,
  Reply,
  MoreHorizontal,
  Edit,
  Bold,
  Italic,
  Code,
  Strikethrough,
  FileText,
  Download,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";
import type { Message, Attachment } from "../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AudioPlayer } from "./AudioPlayer";

// Define ensureValidDate helper function here
const ensureValidDate = (dateInput: any): Date => {
  if (!dateInput) return new Date();

  try {
    const date = new Date(dateInput);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid date detected in ChatMessage:", dateInput);
      return new Date(); // Return current date as fallback
    }
    return date;
  } catch (e) {
    console.warn("Error parsing date in ChatMessage:", e);
    return new Date(); // Return current date as fallback
  }
};

// Update the AttachmentGallery component to handle attachments properly
function AttachmentGallery({ attachments }: { attachments: Attachment[] }) {
  const [selectedImage, setSelectedImage] = useState<Attachment | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  // Group attachments by type
  const imageAttachments = attachments.filter((att) => att.type === "image");
  const fileAttachments = attachments.filter(
    (att) => att.type === "file" || att.type === "audio"
  );

  // Helper to get display name for attachments
  const getDisplayName = (attachment: Attachment) => {
    // First try fileName if it exists (this is the original uploaded filename)
    if (attachment.fileName && attachment.fileName.trim() !== "") {
      return attachment.fileName;
    }

    // Then check the attachment.name property
    if (attachment.name && attachment.name.trim() !== "") {
      return attachment.name;
    }

    // Extract filename from URL as a fallback
    const urlParts = attachment.url.split("/");
    const filenameWithParams = urlParts[urlParts.length - 1];
    const filenameOnly = filenameWithParams.split("?")[0];

    if (filenameOnly && filenameOnly.trim() !== "") {
      return filenameOnly;
    }

    // Final fallback based on file type
    if (attachment.type === "image") return "Image file";
    if (attachment.type === "audio") return "Audio file";
    return "File attachment";
  };

  // Function to handle image click and show in a lightbox
  const openLightbox = (attachment: Attachment) => {
    const index = imageAttachments.findIndex((img) => img.id === attachment.id);
    setSelectedImageIndex(index >= 0 ? index : 0);
    setSelectedImage(attachment);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const goToNextImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent lightbox from closing
    if (imageAttachments.length <= 1) return;

    const nextIndex = (selectedImageIndex + 1) % imageAttachments.length;
    setSelectedImageIndex(nextIndex);
    setSelectedImage(imageAttachments[nextIndex]);
  };

  const goToPrevImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent lightbox from closing
    if (imageAttachments.length <= 1) return;

    const prevIndex =
      (selectedImageIndex - 1 + imageAttachments.length) %
      imageAttachments.length;
    setSelectedImageIndex(prevIndex);
    setSelectedImage(imageAttachments[prevIndex]);
  };

  // Create a grid layout based on number of images
  const renderImageGrid = () => {
    if (imageAttachments.length === 0) return null;

    if (imageAttachments.length === 1) {
      // Single image - larger display
      return (
        <div className="mb-2 max-w-[300px] rounded-lg overflow-hidden">
          <img
            src={imageAttachments[0].url || "/placeholder.svg"}
            alt={getDisplayName(imageAttachments[0])}
            className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => openLightbox(imageAttachments[0])}
          />
        </div>
      );
    } else if (imageAttachments.length === 2) {
      // Two images - side by side
      return (
        <div className="mb-2 grid grid-cols-2 gap-1 max-w-[300px]">
          {imageAttachments.map((attachment) => (
            <div key={attachment.id} className="rounded-lg overflow-hidden">
              <img
                src={attachment.url || "/placeholder.svg"}
                alt={getDisplayName(attachment)}
                className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => openLightbox(attachment)}
              />
            </div>
          ))}
        </div>
      );
    } else if (imageAttachments.length === 3) {
      // Three images - 1 large, 2 stacked
      return (
        <div className="mb-2 grid grid-cols-2 gap-1 max-w-[300px]">
          <div className="rounded-lg overflow-hidden">
            <img
              src={imageAttachments[0].url || "/placeholder.svg"}
              alt={getDisplayName(imageAttachments[0])}
              className="w-full h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => openLightbox(imageAttachments[0])}
            />
          </div>
          <div className="grid grid-rows-2 gap-1">
            {imageAttachments.slice(1, 3).map((attachment) => (
              <div key={attachment.id} className="rounded-lg overflow-hidden">
                <img
                  src={attachment.url || "/placeholder.svg"}
                  alt={getDisplayName(attachment)}
                  className="w-full h-[31.5] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => openLightbox(attachment)}
                />
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      // 4+ images - 2x2 grid with +X indicator if more than 4
      return (
        <div className="mb-2 grid grid-cols-2 gap-1 max-w-[300px]">
          {imageAttachments.slice(0, 4).map((attachment, index) => (
            <div
              key={attachment.id}
              className="relative rounded-lg overflow-hidden"
            >
              <img
                src={attachment.url || "/placeholder.svg"}
                alt={getDisplayName(attachment)}
                className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => openLightbox(attachment)}
              />
              {index === 3 && imageAttachments.length > 4 && (
                <div
                  className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg cursor-pointer"
                  onClick={() => openLightbox(imageAttachments[0])}
                >
                  +{imageAttachments.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
  };

  // Render file attachments as a list
  const renderFileAttachments = () => {
    if (fileAttachments.length === 0) return null;

    return (
      <div className="mb-2 space-y-2">
        {fileAttachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center gap-2 p-2 rounded-md bg-gray-800/50 max-w-[300px]"
          >
            {attachment.type === "audio" ? (
              <AudioPlayer src={attachment.url} />
            ) : (
              <>
                <FileText className="h-5 w-5 text-gray-400" />
                <span className="text-sm truncate flex-1 max-w-[180px]">
                  {getDisplayName(attachment)}
                </span>
                <a
                  href={attachment.url}
                  download={getDisplayName(attachment)}
                  className="p-1 hover:bg-gray-700 rounded-md"
                >
                  <Download className="h-4 w-4" />
                </a>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Lightbox for viewing images
  const renderLightbox = () => {
    if (!selectedImage) return null;

    return (
      <div
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        onClick={closeLightbox}
      >
        <div className="relative max-w-4xl max-h-[90vh]">
          <img
            src={selectedImage.url || "/placeholder.svg"}
            alt={getDisplayName(selectedImage)}
            className="max-w-full max-h-[90vh] object-contain"
          />
          <button
            className="absolute top-2 right-2 text-white bg-black/50 rounded-full p-1"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image filename display */}
          <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded text-sm max-w-[80%] truncate">
            {getDisplayName(selectedImage)}
          </div>

          {/* Image counter indicator */}
          {imageAttachments.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
              {selectedImageIndex + 1} / {imageAttachments.length}
            </div>
          )}

          {/* Navigation buttons */}
          {imageAttachments.length > 1 && (
            <>
              <button
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                onClick={goToPrevImage}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <button
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                onClick={goToNextImage}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {renderImageGrid()}
      {renderFileAttachments()}
      {renderLightbox()}
    </div>
  );
}

interface ChatMessageProps {
  message: Message;
  onReply?: (message: Message) => void;
}

export function ChatMessage({ message, onReply }: ChatMessageProps) {
  const { user } = useAuth();
  const {
    editMessage,
    deleteMessage,
    reactToMessage,
    currentlyEditingId,
    setCurrentlyEditingId,
  } = useChat();

  // Update all references to content in the component
  const [editedContent, setEditedContent] = useState(message.text);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<"top" | "bottom">(
    "bottom"
  );
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const isCurrentUser = message.sender?.id === user?.id;
  const [isHovering, setIsHovering] = useState(false);

  // Determine if message is long (over 300 characters or has more than 4 lines)
  const messageContent = message.text || "";
  const messageReactions = message.reactions || [];
  const isLongMessage =
    messageContent.length > 300 || messageContent.split("\n").length > 4;

  // Determine picker position when opening
  useEffect(() => {
    if (showEmojiPicker && emojiButtonRef.current) {
      const buttonRect = emojiButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const isNearBottom = spaceBelow < 100; // Check if near bottom of viewport

      // If less than 60px below, position above
      if (spaceBelow < 60) {
        setPickerPosition("top");
      } else {
        setPickerPosition("bottom");
      }
    }
  }, [showEmojiPicker]);

  // Determine if this message is being edited
  const isEditing = currentlyEditingId === message.id;

  // Auto-focus and handle textarea height adjustment
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Adjust textarea height based on content
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
    }
  };

  // Reset edited content when editing starts
  useEffect(() => {
    if (isEditing) {
      setEditedContent(message.text);
      // Allow DOM to update before adjusting height
      setTimeout(() => {
        adjustTextareaHeight();
        textareaRef.current?.focus();
      }, 0);
    }
  }, [isEditing, message.text]);

  // Reset menu state when editing is complete
  useEffect(() => {
    if (!isEditing) {
      setIsMenuOpen(false);
    }
  }, [isEditing]);

  // Add selection state
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);

  // Add formatting functions
  const applyFormatting = (
    formatType: "bold" | "italic" | "strikethrough" | "code"
  ) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // If no text is selected, return
    if (start === end) return;

    const selectedText = editedContent.substring(start, end);

    let formattedText = "";
    let newCursorPos = 0;

    switch (formatType) {
      case "bold":
        formattedText = `*${selectedText}*`;
        newCursorPos = end + 2; // Account for the two * characters
        break;
      case "italic":
        formattedText = `_${selectedText}_`;
        newCursorPos = end + 2; // Account for the two _ characters
        break;
      case "strikethrough":
        formattedText = `~${selectedText}~`;
        newCursorPos = end + 2; // Account for the two ~ characters
        break;
      case "code":
        formattedText = `\`${selectedText}\``;
        newCursorPos = end + 2; // Account for the two ` characters
        break;
    }

    // Update the text
    const newText =
      editedContent.substring(0, start) +
      formattedText +
      editedContent.substring(end);
    setEditedContent(newText);

    // Save selection to restore focus after state update
    setSelection({
      start: start,
      end: newCursorPos,
    });
  };

  // Effect to restore cursor position after formatting
  useEffect(() => {
    if (selection && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(selection.end, selection.end);
      setSelection(null);
    }
  }, [selection, editedContent]);

  const handleSaveEdit = async () => {
    if (editedContent.trim() !== message.text) {
      await editMessage(message.id, editedContent);
    }
    setCurrentlyEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditedContent(message.text);
    setCurrentlyEditingId(null);
  };

  const handleDelete = async () => {
    // Close any open edit box before deleting
    if (currentlyEditingId) {
      setCurrentlyEditingId(null);
    }
    await deleteMessage(message.id);
  };

  const handleReaction = async (emoji: string) => {
    // Close any open edit box before reacting
    if (currentlyEditingId) {
      setCurrentlyEditingId(null);
    }
    await reactToMessage(message.id, emoji);
    setShowEmojiPicker(false);
  };

  const handleReply = () => {
    // Close any open edit box before replying
    if (currentlyEditingId) {
      setCurrentlyEditingId(null);
    }

    if (onReply) {
      onReply(message);
    }
  };

  // Toggle message expansion
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Check if current user has reacted with a specific emoji
  const hasUserReacted = (emoji: string) => {
    const reaction = messageReactions.find((r) => r.emoji === emoji);
    return reaction ? reaction.users.includes(user?.id || "") : false;
  };

  // Calculate messageDate directly on each render
  const messageDate = ensureValidDate(message.timestamp);
  const [displayTime, setDisplayTime] = useState(() =>
    getFormattedTimestamp(messageDate)
  );

  // Helper function to format timestamp based on age
  function getFormattedTimestamp(date: Date): string {
    const now = new Date();
    const minutesAgo = differenceInMinutes(now, date);

    if (minutesAgo < 1) {
      return "just now";
    }
    if (minutesAgo < 60) {
      // formatDistanceToNow doesn't update automatically, so calculate manually for < 1 hr
      return `${minutesAgo} minute${minutesAgo > 1 ? "s" : ""} ago`;
    }
    if (isToday(date)) {
      return format(date, "p"); // e.g., 4:30 PM
    }
    if (isYesterday(date)) {
      return `Yesterday at ${format(date, "p")}`;
    }
    // Older than yesterday - show Date and Time
    return format(date, "MMM d, p"); // e.g., Apr 10, 4:30 PM
    // Or include year for much older messages: format(date, 'P p') -> 04/10/2024, 4:30 PM
  }

  // Effect to update timestamp every minute
  useEffect(() => {
    // Update display time whenever messageDate changes (covers initial render and prop updates)
    setDisplayTime(getFormattedTimestamp(messageDate));

    const intervalId = setInterval(() => {
      setDisplayTime(getFormattedTimestamp(messageDate));
    }, 60000); // Update every 60 seconds

    // Cleanup interval on component unmount or when messageDate changes
    return () => clearInterval(intervalId);
  }, [messageDate]); // Dependency is messageDate

  // Render message content with potential truncation
  const renderMessageContent = () => {
    const lines = messageContent.split("\n");

    // Format text with markdown-like syntax
    const formatText = (text: string) => {
      // Process combined styles first, then individual styles
      return (
        text
          // Bold and Italic combined: *_text_*
          .replace(/\*_(.*?)_\*/g, '<span class="font-bold italic">$1</span>')
          // Italic and Bold combined: _*text*_
          .replace(/_\*(.*?)\*_/g, '<span class="font-bold italic">$1</span>')
          // Strikethrough with Bold: ~*text*~
          .replace(
            /~\*(.*?)\*~/g,
            '<span class="line-through font-bold">$1</span>'
          )
          // Bold with Strikethrough: *~text~*
          .replace(
            /\*~(.*?)~\*/g,
            '<span class="line-through font-bold">$1</span>'
          )
          // Strikethrough with Italic: ~_text_~
          .replace(/~_(.*?)_~/g, '<span class="line-through italic">$1</span>')
          // Italic with Strikethrough: _~text~_
          .replace(/_~(.*?)~_/g, '<span class="line-through italic">$1</span>')
          // Bold: *text*
          .replace(/\*(.*?)\*/g, '<span class="font-bold">$1</span>')
          // Italic: _text_
          .replace(/_(.*?)_/g, '<span class="italic">$1</span>')
          // Strikethrough: ~text~
          .replace(/~(.*?)~/g, '<span class="line-through">$1</span>')
          // Monospace (code): `text`
          .replace(
            /`(.*?)`/g,
            '<span class="font-mono bg-[#1a222c66] px-1 py-0.5 rounded text-sm">$1</span>'
          )
      );
    };

    if (!isLongMessage || isExpanded) {
      // Show full content
      return (
        <div className="w-full">
          {lines.map((line, index, array) => (
            <div key={index} className="w-full">
              <span
                className="break-words whitespace-normal inline-block w-full message-content"
                dangerouslySetInnerHTML={{ __html: formatText(line) }}
              />
              {index < array.length - 1 && <br />}
            </div>
          ))}
        </div>
      );
    } else {
      // Show truncated content
      let truncatedContent = "";
      let lineCount = 0;
      let charCount = 0;

      // Truncate to first 4 lines or 300 characters, whichever comes first
      for (const line of lines) {
        if (lineCount < 4 && charCount + line.length <= 300) {
          truncatedContent += (truncatedContent ? "\n" : "") + line;
          lineCount++;
          charCount += line.length + 1; // +1 for newline
        } else {
          break;
        }
      }

      // Split truncated content for rendering
      return (
        <div className="w-full">
          {truncatedContent.split("\n").map((line, index, array) => (
            <div key={index} className="w-full">
              <span
                className="break-words whitespace-normal inline-block w-full message-content"
                dangerouslySetInnerHTML={{ __html: formatText(line) }}
              />
              {index < array.length - 1 && <br />}
            </div>
          ))}
          {charCount < messageContent.length && "..."}
        </div>
      );
    }
  };

  // Render message reactions
  const renderReactions = () => {
    if (!messageReactions || messageReactions.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {messageReactions.map((reaction) => (
          <button
            key={reaction.emoji}
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs transition-colors",
              hasUserReacted(reaction.emoji)
                ? "bg-purple-600/70 text-white"
                : "bg-gray-700/60 text-gray-200 hover:bg-gray-700"
            )}
            onClick={() => handleReaction(reaction.emoji)}
          >
            <span className="mr-1">{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </button>
        ))}
      </div>
    );
  };

  // Popular emojis for quick reactions
  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  return (
    <div
      className={cn(
        "group transition-colors rounded-md px-4 py-2",
        isMenuOpen || isEditing ? "bg-gray-800/30" : "hover:bg-gray-800/30"
      )}
    >
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="flex justify-center">
          <UserAvatar user={message.sender} className="h-8 w-8" />
        </div>

        <div>
          <div className="flex items-center mb-1">
            <span className="font-medium mr-2">
              {message.sender?.username || "Unknown User"}
            </span>
            <span
              className="text-xs text-gray-400"
              title={format(messageDate, "PPpp")}
            >
              {displayTime}
            </span>
            {message.isEdited && (
              <span className="text-xs text-gray-400 ml-1">(edited)</span>
            )}
          </div>

          {/* Message Content Area */}
          {isEditing ? (
            <div className="w-full bg-gray-900/90 p-3 rounded-lg border border-purple-600/50 shadow-lg">
              <div className="flex justify-between mb-2">
                <div className="flex items-center rounded-lg bg-gray-800/80 p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-700/50 rounded-md"
                    onClick={() => applyFormatting("bold")}
                    title="Bold"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-700/50 rounded-md"
                    onClick={() => applyFormatting("italic")}
                    title="Italic"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-700/50 rounded-md"
                    onClick={() => applyFormatting("strikethrough")}
                    title="Strikethrough"
                  >
                    <Strikethrough className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-700/50 rounded-md"
                    onClick={() => applyFormatting("code")}
                    title="Code"
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-gray-400 flex items-center">
                  Press Ctrl+Enter to save
                </div>
              </div>
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={editedContent}
                  onChange={(e) => {
                    setEditedContent(e.target.value);
                    adjustTextareaHeight();
                  }}
                  className="w-full bg-gray-800 border-gray-700 focus-visible:ring-1 focus-visible:ring-purple-500 text-white resize-none py-2 min-h-[24px] max-h-[300px] overflow-y-auto custom-scrollbar"
                  placeholder="Edit your message..."
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      handleCancelEdit();
                    } else if (e.key === "Enter" && e.ctrlKey) {
                      handleSaveEdit();
                    }
                  }}
                />
              </div>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                <div>{editedContent.length} characters</div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-8 px-3 text-gray-300 hover:bg-gray-700"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveEdit}
                    className="h-8 px-3 bg-purple-600 hover:bg-purple-700"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Show attachments if any */}
              {message.attachments && message.attachments.length > 0 && (
                <AttachmentGallery attachments={message.attachments} />
              )}

              {/* Show message content if any */}
              {messageContent && (
                <div className="relative w-fit">
                  <div
                    className={cn(
                      "bg-purple-800/80 text-white px-4 py-2 text-left w-fit whitespace-pre-wrap break-words overflow-hidden max-w-full sm:max-w-[80%] md:max-w-[600px] lg:max-w-[800px] rounded-lg"
                    )}
                  >
                    {message.replyTo && (
                      <div className="mb-2 border-l-4 border-purple-300 bg-[#00000036] px-3 py-2 rounded-md -mx-3 -mt-1">
                        <div className="flex items-center">
                          <span className="text-xs font-semibold text-purple-200">
                            {message.replyTo.sender?.username || "Unknown"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-300/90 break-words line-clamp-1 mr-2">
                          {message.replyTo.text}
                        </div>
                      </div>
                    )}

                    {renderMessageContent()}

                    {/* Read more / Read less button */}
                    {isLongMessage && (
                      <button
                        onClick={toggleExpand}
                        className="text-xs text-purple-300 hover:text-purple-200 mt-1 font-medium block"
                      >
                        {isExpanded ? "Read less" : "Read more"}
                      </button>
                    )}
                  </div>

                  {/* Show reactions below the message */}
                  {renderReactions()}
                </div>
              )}
            </div>
          )}

          {/* INSERT ORIGINAL HOVER ACTIONS BLOCK START */}
          {!isEditing && (
            <div
              className={cn(
                "flex mt-1 transition-opacity",
                isMenuOpen || showEmojiPicker
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              )}
            >
              <div className="flex gap-2">
                {/* Reply button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleReply}
                >
                  <Reply className="h-3.5 w-3.5 mr-1" />
                  Reply
                </Button>

                {/* Emoji reaction button */}
                <div className="relative">
                  <Button
                    ref={emojiButtonRef}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <SmilePlus className="h-3.5 w-3.5" />
                  </Button>

                  {/* Smart-positioned emoji picker */}
                  {showEmojiPicker && (
                    <>
                      {/* Transparent overlay to detect outside clicks */}
                      <div
                        className="fixed inset-0 z-[60]"
                        onClick={() => setShowEmojiPicker(false)}
                      />
                      <div
                        ref={pickerRef}
                        className={cn(
                          "absolute left-0 mt-1 mb-1 bg-gray-800/90 rounded-full shadow-lg px-3 py-1.5 z-[70]",
                          pickerPosition === "top"
                            ? "bottom-full" // Position above the button
                            : "top-full" // Position below the button
                        )}
                        style={{
                          maxHeight: "400px", // Ensure it doesn't get too tall
                          marginBottom:
                            pickerPosition === "bottom" ? "60px" : undefined, // Add extra bottom margin when at bottom
                          marginTop:
                            pickerPosition === "top" ? "10px" : undefined, // Extra margin when at top
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          {quickReactions.map((emoji) => (
                            <button
                              key={emoji}
                              className="hover:bg-gray-700/60 p-1 rounded-full transition-colors text-lg"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent closing before handling reaction
                                handleReaction(emoji);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Menu button for owner of message */}
                {isCurrentUser && (
                  <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-[160px] bg-gray-900 border-gray-700"
                    >
                      <DropdownMenuItem
                        onClick={() => {
                          // Close any other open menu before editing
                          setIsMenuOpen(false);
                          setCurrentlyEditingId(message.id);
                        }}
                        className="text-white hover:bg-gray-800"
                      >
                        <Edit className="h-3.5 w-3.5 mr-2" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-[#ae1111] hover:bg-[#ae1111]/10 focus:text-[#ae1111]"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )}
          {/* INSERT ORIGINAL HOVER ACTIONS BLOCK END */}
        </div>
      </div>
    </div>
  );
}
