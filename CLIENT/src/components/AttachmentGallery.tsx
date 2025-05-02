"use client"

import type React from "react"

import { useState } from "react"
import { X, FileText, Download } from "lucide-react"
import { AudioPlayer } from "./AudioPlayer"
import type { Attachment } from "@/types"

interface AttachmentGalleryProps {
  attachments: Attachment[]
}

export function AttachmentGallery({ attachments }: AttachmentGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<Attachment | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)

  // Group attachments by type
  const imageAttachments = attachments.filter((att) => att.type === "image")
  const fileAttachments = attachments.filter((att) => att.type === "file" || att.type === "audio")

  // Function to handle image click and show in a lightbox
  const openLightbox = (attachment: Attachment) => {
    const index = imageAttachments.findIndex((img) => img.id === attachment.id)
    setSelectedImageIndex(index >= 0 ? index : 0)
    setSelectedImage(attachment)
  }

  const closeLightbox = () => {
    setSelectedImage(null)
  }

  const goToNextImage = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent lightbox from closing
    if (imageAttachments.length <= 1) return

    const nextIndex = (selectedImageIndex + 1) % imageAttachments.length
    setSelectedImageIndex(nextIndex)
    setSelectedImage(imageAttachments[nextIndex])
  }

  const goToPrevImage = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent lightbox from closing
    if (imageAttachments.length <= 1) return

    const prevIndex = (selectedImageIndex - 1 + imageAttachments.length) % imageAttachments.length
    setSelectedImageIndex(prevIndex)
    setSelectedImage(imageAttachments[prevIndex])
  }

  // Create a grid layout based on number of images
  const renderImageGrid = () => {
    if (imageAttachments.length === 0) return null

    if (imageAttachments.length === 1) {
      // Single image - larger display
      return (
        <div className="mb-2 max-w-[300px] rounded-lg overflow-hidden">
          <img
            src={imageAttachments[0].url || "/placeholder.svg"}
            alt={imageAttachments[0].name}
            className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => openLightbox(imageAttachments[0])}
          />
        </div>
      )
    } else if (imageAttachments.length === 2) {
      // Two images - side by side
      return (
        <div className="mb-2 grid grid-cols-2 gap-1 max-w-[300px]">
          {imageAttachments.map((attachment) => (
            <div key={attachment.id} className="rounded-lg overflow-hidden">
              <img
                src={attachment.url || "/placeholder.svg"}
                alt={attachment.name}
                className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => openLightbox(attachment)}
              />
            </div>
          ))}
        </div>
      )
    } else if (imageAttachments.length === 3) {
      // Three images - 1 large, 2 stacked
      return (
        <div className="mb-2 grid grid-cols-2 gap-1 max-w-[300px]">
          <div className="rounded-lg overflow-hidden">
            <img
              src={imageAttachments[0].url || "/placeholder.svg"}
              alt={imageAttachments[0].name}
              className="w-full h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => openLightbox(imageAttachments[0])}
            />
          </div>
          <div className="grid grid-rows-2 gap-1">
            {imageAttachments.slice(1, 3).map((attachment) => (
              <div key={attachment.id} className="rounded-lg overflow-hidden">
                <img
                  src={attachment.url || "/placeholder.svg"}
                  alt={attachment.name}
                  className="w-full h-[31.5] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => openLightbox(attachment)}
                />
              </div>
            ))}
          </div>
        </div>
      )
    } else {
      // 4+ images - 2x2 grid with +X indicator if more than 4
      return (
        <div className="mb-2 grid grid-cols-2 gap-1 max-w-[300px]">
          {imageAttachments.slice(0, 4).map((attachment, index) => (
            <div key={attachment.id} className="relative rounded-lg overflow-hidden">
              <img
                src={attachment.url || "/placeholder.svg"}
                alt={attachment.name}
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
      )
    }
  }

  // Render file attachments as a list
  const renderFileAttachments = () => {
    if (fileAttachments.length === 0) return null

    return (
      <div className="mb-2 space-y-2">
        {fileAttachments.map((attachment) => (
          <div key={attachment.id} className="flex items-center gap-2 p-2 rounded-md bg-gray-800/50 max-w-[300px]">
            {attachment.type === "audio" ? (
              <AudioPlayer src={attachment.url} />
            ) : (
              <>
                <FileText className="h-5 w-5 text-gray-400" />
                <span className="text-sm truncate flex-1">{attachment.name}</span>
                <a href={attachment.url} download={attachment.name} className="p-1 hover:bg-gray-700 rounded-md">
                  <Download className="h-4 w-4" />
                </a>
              </>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Lightbox for viewing images
  const renderLightbox = () => {
    if (!selectedImage) return null

    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={closeLightbox}>
        <div className="relative max-w-4xl max-h-[90vh]">
          <img
            src={selectedImage.url || "/placeholder.svg"}
            alt={selectedImage.name}
            className="max-w-full max-h-[90vh] object-contain"
          />
          <button
            className="absolute top-2 right-2 text-white bg-black/50 rounded-full p-1"
            onClick={(e) => {
              e.stopPropagation()
              closeLightbox()
            }}
          >
            <X className="h-6 w-6" />
          </button>

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
    )
  }

  return (
    <div className="space-y-2">
      {renderImageGrid()}
      {renderFileAttachments()}
      {renderLightbox()}
    </div>
  )
}
