"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface AudioPlayerProps {
  src: string;
  className?: string;
}

export function AudioPlayer({ src, className = "" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load audio and extract duration using Web Audio API
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset state on src change
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsLoaded(false);
    audio.currentTime = 0;

    // Create AudioContext if it doesn't exist
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    // Fetch the audio file and decode it to get accurate duration
    fetch(src)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        if (audioContextRef.current) {
          return audioContextRef.current.decodeAudioData(arrayBuffer);
        }
        throw new Error("AudioContext not available");
      })
      .then((audioBuffer) => {
        console.log(
          `Web Audio API - Decoded Duration: ${audioBuffer.duration}`
        );
        setDuration(audioBuffer.duration);
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error("Error loading audio with Web Audio API:", error);
        // Fallback to traditional audio element if Web Audio API fails
        console.log("Falling back to standard audio element...");

        // Force the audio to load metadata
        audio.load();

        // Mark as loaded to allow controls to be used
        setIsLoaded(true);

        // Try to get duration from audio element as fallback
        if (
          audio.duration &&
          !isNaN(audio.duration) &&
          audio.duration !== Infinity
        ) {
          console.log(`Fallback - Audio element duration: ${audio.duration}`);
          setDuration(audio.duration);
        } else {
          // If all else fails, set a placeholder duration
          console.warn("Could not determine audio duration, using placeholder");
          setDuration(30); // Using 30 seconds as placeholder
        }
      });

    return () => {
      // Clean up audio context when component unmounts or src changes
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current
          .close()
          .catch((err) => console.error("Error closing AudioContext:", err));
      }
    };
  }, [src]);

  // Set up event listeners for playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = (e: Event) => console.error("Audio playback error:", e);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  // Handle play/pause
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !isLoaded) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.error("Error playing audio:", err);
        setIsPlaying(false);
      });
    }
    setIsPlaying(!isPlaying);
  };

  // Handle seek
  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio || !isLoaded || duration <= 0) return;

    const seekTime = value[0];
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  // Format time display
  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity || time < 0) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  console.log(
    `Rendering AudioPlayer: duration=${duration}, currentTime=${currentTime}, isLoaded=${isLoaded}, isPlaying=${isPlaying}`
  );

  return (
    <div
      className={`flex items-center gap-3 rounded-lg p-3 bg-muted/10 w-full max-w-[300px] ${className}`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <Button
        size="sm"
        variant="ghost"
        className="h-9 w-9 p-0 rounded-full bg-purple-600/80 text-white hover:bg-purple-600 flex-shrink-0"
        onClick={togglePlay}
        disabled={!isLoaded}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div className="flex-1 flex flex-col">
        <Slider
          value={[currentTime]}
          max={duration > 0 ? duration : 1}
          step={0.1}
          onValueChange={handleSeek}
          className="my-1"
          disabled={!isLoaded || duration <= 0}
        />

        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
