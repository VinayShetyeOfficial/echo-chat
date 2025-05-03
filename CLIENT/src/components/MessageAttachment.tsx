"use client"

import { useState, useEffect } from "react"
import type { Attachment } from "@/types"
import { FileIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { getFileUrl } from "@/lib/uploadFile"

interface MessageAttachmentProps {
  attachment: Attachment
  className?: string
  isPreview?: boolean
  onRemove?: () => void
}

export function MessageAttachment({ attachment, className, isPreview, onRemove }: MessageAttachmentProps) {
  const [isImageError, setIsImageError] = useState(false)
  const [fileUrl, setFileUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  // Load file data from the database
  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    const loadFileData = async () => {
      try {
        const url = await getFileUrl(attachment.url)
        if (isMounted) {
          setFileUrl(url)
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Error loading file:", error)
        if (isMounted) {
          setIsImageError(true)
          setIsLoading(false)
        }
      }
    }

    loadFileData()

    return () => {
      isMounted = false
    }
  }, [attachment.url])

  // Use a placeholder for broken images
  const imagePlaceholder = "/placeholders/broken-image.png"

  // Handle image load error
  const handleImageError = () => {
    console.error(`Failed to load image: ${attachment.url}`)
    setIsImageError(true)
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className={cn("rounded-md bg-muted p-2 animate-pulse", className)}>
        <div className="h-20 w-full bg-muted-foreground/20 rounded"></div>
      </div>
    )
  }

  // For images
  if (attachment.type === "image" && !isImageError && fileUrl) {
    return (
      <div
        className={cn(
          "group relative overflow-hidden rounded-md",
          isPreview ? "h-24 w-24" : "max-h-80 max-w-full",
          className,
        )}
      >
        <img
          src={fileUrl}
          alt={attachment.name || "Image attachment"}
          className={cn(
            "h-full w-full object-cover transition-all",
            isPreview ? "aspect-square object-cover" : "max-h-80 rounded-md object-contain",
          )}
          onError={handleImageError}
        />
        {isPreview && onRemove && (
          <button
            onClick={onRemove}
            className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            aria-label="Remove attachment"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  // For audio
  if (attachment.type === "audio" && fileUrl) {
    return (
      <div className={cn("flex items-center gap-2 rounded-md border border-border bg-background p-2", className)}>
        <audio controls src={fileUrl} className="h-8 max-w-full" title={attachment.name || "Audio attachment"} />
        {isPreview && onRemove && (
          <button
            onClick={onRemove}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
            aria-label="Remove attachment"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  // For other file types
  return (
    <div className={cn("flex items-center gap-2 rounded-md border border-border bg-background p-2", className)}>
      <FileIcon className="h-5 w-5 flex-shrink-0 text-primary" />
      <span className="truncate text-sm">{attachment.name || "File attachment"}</span>
      {isPreview && onRemove && (
        <button
          onClick={onRemove}
          className="ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
          aria-label="Remove attachment"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
