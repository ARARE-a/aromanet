import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface StoryItem {
  id: number;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string | null;
  expiresAt: Date | string;
  createdAt: Date | string;
}

export interface StoryAuthor {
  id: number;
  name: string;
  avatarUrl?: string | null;
  role: "therapist" | "store";
  stories: StoryItem[];
}

interface StoryViewerProps {
  authors: StoryAuthor[];
  initialAuthorIndex?: number;
  onClose: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per story

export function StoryViewer({ authors, initialAuthorIndex = 0, onClose }: StoryViewerProps) {
  const [authorIdx, setAuthorIdx] = useState(initialAuthorIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const currentAuthor = authors[authorIdx];
  const currentStory = currentAuthor?.stories[storyIdx];
  const totalStories = currentAuthor?.stories.length ?? 0;

  const goNext = useCallback(() => {
    if (storyIdx < totalStories - 1) {
      setStoryIdx(s => s + 1);
      setProgress(0);
    } else if (authorIdx < authors.length - 1) {
      setAuthorIdx(a => a + 1);
      setStoryIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [storyIdx, totalStories, authorIdx, authors.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(s => s - 1);
      setProgress(0);
    } else if (authorIdx > 0) {
      setAuthorIdx(a => a - 1);
      setStoryIdx(0);
      setProgress(0);
    }
  }, [storyIdx, authorIdx]);

  // Auto-advance timer
  useEffect(() => {
    if (paused || !currentStory) return;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + (100 / (STORY_DURATION / 100));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [paused, currentStory, goNext]);

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
  }, [storyIdx, authorIdx]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  if (!currentAuthor || !currentStory) return null;

  const timeAgo = (date: Date | string) => {
    const diff = Date.now() - new Date(date).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (h > 0) return `${h}時間前`;
    if (m > 0) return `${m}分前`;
    return "たった今";
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        style={{ touchAction: "none" }}
      >
        {/* Story container */}
        <div className="relative w-full max-w-sm h-full max-h-[100dvh] overflow-hidden">
          {/* Media */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${authorIdx}-${storyIdx}`}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {currentStory.mediaType === "video" ? (
                <video
                  src={currentStory.mediaUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                  onEnded={goNext}
                />
              ) : (
                <img
                  src={currentStory.mediaUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Gradient overlay top */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          {/* Gradient overlay bottom */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

          {/* Progress bars */}
          <div className="absolute top-3 inset-x-3 flex gap-1 z-10">
            {currentAuthor.stories.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-none"
                  style={{
                    width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author info */}
          <div className="absolute top-7 inset-x-3 flex items-center gap-2 z-10">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white flex-shrink-0 bg-gray-300">
              {currentAuthor.avatarUrl ? (
                <img src={currentAuthor.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-400 to-teal-600">
                  <span className="text-white text-xs font-bold">{currentAuthor.name[0]}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{currentAuthor.name}</p>
              <p className="text-white/70 text-xs">{timeAgo(currentStory.createdAt)}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-8 inset-x-4 z-10">
              <p className="text-white text-sm text-center drop-shadow-lg">{currentStory.caption}</p>
            </div>
          )}

          {/* Tap zones */}
          <button
            className="absolute left-0 top-0 w-1/3 h-full z-20"
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => { setPaused(false); goPrev(); }}
          />
          <button
            className="absolute right-0 top-0 w-1/3 h-full z-20"
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => { setPaused(false); goNext(); }}
          />

          {/* Author navigation arrows (desktop) */}
          {authorIdx > 0 && (
            <button onClick={() => { setAuthorIdx(a => a - 1); setStoryIdx(0); setProgress(0); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {authorIdx < authors.length - 1 && (
            <button onClick={() => { setAuthorIdx(a => a + 1); setStoryIdx(0); setProgress(0); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
