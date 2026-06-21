import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, MoreHorizontal, X } from "lucide-react";

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
  const [showMenu, setShowMenu] = useState(false);

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
    setShowMenu(false);
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
    if (h > 0) return `${h}時間`;
    if (m > 0) return `${m}分`;
    return "今";
  };

  const releaseAnd = (action: () => void) => {
    setPaused(false);
    action();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-[#050b0e] flex items-center justify-center"
        style={{ touchAction: "none" }}
      >
        {/* Story container */}
        <div className="relative w-full max-w-[430px] h-[100dvh] overflow-hidden bg-[#050b0e]">
          <div className="absolute inset-0 overflow-hidden bg-black">
            {/* Media */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${authorIdx}-${storyIdx}`}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
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
          </div>

          {/* Gradient overlay top */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/65 via-black/25 to-transparent pointer-events-none" />
          {/* Gradient overlay bottom */}
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/65 via-black/25 to-transparent pointer-events-none" />

          {/* Progress bars */}
          <div className="absolute top-[calc(env(safe-area-inset-top)+14px)] inset-x-4 flex gap-1 z-40">
            {currentAuthor.stories.map((_, i) => (
              <div key={i} className="flex-1 h-[3px] bg-white/35 rounded-full overflow-hidden shadow-sm">
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
          <div className="absolute top-[calc(env(safe-area-inset-top)+34px)] inset-x-4 flex items-center gap-2 z-40">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/80 flex-shrink-0 bg-gray-300 shadow-sm">
              {currentAuthor.avatarUrl ? (
                <img src={currentAuthor.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-400 to-teal-600">
                  <span className="text-white text-sm font-bold">{currentAuthor.name[0]}</span>
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <p className="text-white text-[16px] font-bold truncate drop-shadow">{currentAuthor.name}</p>
              <p className="text-white/80 text-[15px] whitespace-nowrap drop-shadow">{timeAgo(currentStory.createdAt)}</p>
            </div>
            <button
              aria-label="メニュー"
              onClick={() => {
                setShowMenu(open => {
                  const next = !open;
                  setPaused(next);
                  return next;
                });
              }}
              className="w-9 h-9 flex items-center justify-center text-white"
            >
              <MoreHorizontal className="w-7 h-7 drop-shadow" />
            </button>
            <button onClick={onClose} aria-label="閉じる" className="w-10 h-10 flex items-center justify-center text-white">
              <X className="w-9 h-9 drop-shadow" strokeWidth={1.8} />
            </button>
          </div>

          {showMenu && (
            <div className="absolute right-4 top-[calc(env(safe-area-inset-top)+82px)] z-50 w-44 overflow-hidden rounded-2xl bg-black/75 text-white shadow-2xl backdrop-blur-md border border-white/15">
              <button
                onClick={onClose}
                className="w-full px-4 py-3 text-left text-sm active:bg-white/10"
              >
                ストーリーを閉じる
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  setPaused(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-white/75 active:bg-white/10 border-t border-white/10"
              >
                キャンセル
              </button>
            </div>
          )}

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+124px)] inset-x-8 z-40">
              <p className="whitespace-pre-wrap text-white text-[21px] leading-tight text-center font-medium drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)]">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Tap zones */}
          <button
            aria-label="前のストーリー"
            className="absolute left-0 top-24 bottom-16 w-1/3 z-20"
            onPointerDown={() => setPaused(true)}
            onPointerCancel={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
            onPointerUp={() => releaseAnd(goPrev)}
          />
          <button
            aria-label="次のストーリー"
            className="absolute right-0 top-24 bottom-16 w-1/3 z-20"
            onPointerDown={() => setPaused(true)}
            onPointerCancel={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
            onPointerUp={() => releaseAnd(goNext)}
          />

          {/* Author navigation arrows (desktop) */}
          {authorIdx > 0 && (
            <button onClick={() => { setAuthorIdx(a => a - 1); setStoryIdx(0); setProgress(0); }}
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-black/40 rounded-full items-center justify-center text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {authorIdx < authors.length - 1 && (
            <button onClick={() => { setAuthorIdx(a => a + 1); setStoryIdx(0); setProgress(0); }}
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-black/40 rounded-full items-center justify-center text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
