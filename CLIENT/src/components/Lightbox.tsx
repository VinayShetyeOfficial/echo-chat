import React from "react";
import { X, Download } from "lucide-react"; // Import icons

// Basic structure for the Lightbox component
// A full implementation would likely involve a library like 'react-photoswipe-gallery' or a custom modal solution
interface LightboxProps {
  open: boolean;
  close: () => void;
  index: number;
  slides: { src: string; alt?: string; downloadUrl?: string }[];
}

export function Lightbox({ open, close, index, slides }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = React.useState(index);

  React.useEffect(() => {
    setCurrentIndex(index); // Sync index when prop changes
  }, [index]);

  React.useEffect(() => {
    if (!open) return;
    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, slides.length, currentIndex]); // Depend on currentIndex too

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
  };

  const goToPrev = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + slides.length) % slides.length
    );
  };

  if (!open || slides.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
      onClick={close} // Close on backdrop click
    >
      {/* Close Button */}
      <button
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white"
        onClick={close}
        aria-label="Close lightbox"
      >
        <X className="h-8 w-8" />
      </button>

      {/* Content (Image) */}
      <div
        className="relative max-w-4xl max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image area
      >
        <img
          src={slides[currentIndex].src}
          alt={slides[currentIndex].alt || "Lightbox image"}
          className="max-w-full max-h-[90vh] object-contain block shadow-xl"
        />
      </div>

      {/* Navigation Buttons (if more than one slide) */}
      {slides.length > 1 && (
        <>
          {/* Prev Button */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white bg-black/30 rounded-full p-2"
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            aria-label="Previous image"
          >
            {/* Basic SVG Chevron Left */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          {/* Next Button */}
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white bg-black/30 rounded-full p-2"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            aria-label="Next image"
          >
            {/* Basic SVG Chevron Right */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}

      {/* Optional: Download Button */}
      {slides[currentIndex].downloadUrl && (
        <a
          href={slides[currentIndex].downloadUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 z-10 text-white/70 hover:text-white bg-black/30 rounded-full p-2"
          onClick={(e) => e.stopPropagation()}
          aria-label="Download image"
        >
          <Download className="h-5 w-5" />
        </a>
      )}

      {/* Optional: Counter */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white/70 bg-black/30 rounded-full px-3 py-1 text-sm">
          {currentIndex + 1} / {slides.length}
        </div>
      )}
    </div>
  );
}

export default Lightbox; // Export default for convenience
