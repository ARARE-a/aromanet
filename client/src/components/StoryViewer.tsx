import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, MoreHorizontal, X } from "lucide-react";

export interface StoryItem {
  id: number;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string | null;
  editorState?: string | null;
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

type ParsedEditorState = {
  text: string;
  textColor: string;
  textSize: number;
  textX: number;
  textY: number;
  cropX: number;
  cropY: number;
  cropScale: number;
};

const STORY_DURATION = 5000;

function parseEditorState(raw?: string | null): ParsedEditorState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      text: String(parsed.text ?? ""),
      textColor: String(parsed.textColor ?? "#ffffff"),
      textSize: Number(parsed.textSize ?? 28),
      textX: Number(parsed.textX ?? 50),
      textY: Number(parsed.textY ?? 70),
      cropX: Number(parsed.cropX ?? 50),
      cropY: Number(parsed.cropY ?? 50),
      cropScale: Number(parsed.cropScale ?? 1),
    };
  } catch {
    return null;
  }
}

function readableTextSize(size: number, text: string) {
  const longestLine = Math.max(
    ...(text || "").split(/\r?\n/).map(line => line.length),
    0
  );
  if (longestLine <= 10) return size;
  if (longestLine <= 16) return Math.min(size, 58);
  if (longestLine <= 24) return Math.min(size, 48);
  return Math.min(size, 38);
}

function timeAgo(date: Date | string) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h > 0) return `${h}時間`;
  if (m > 0) return `${m}分`;
  return "今";
}

export function StoryViewer({
  authors,
  initialAuthorIndex = 0,
  onClose,
}: StoryViewerProps) {
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

  useEffect(() => {
    if (paused || !currentStory) return;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + 100 / (STORY_DURATION / 100);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [paused, currentStory, goNext]);

  useEffect(() => {
    setProgress(0);
    setShowMenu(false);
  }, [storyIdx, authorIdx]);

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

  const editor = parseEditorState(currentStory.editorState);
  const overlayText = editor?.text || currentStory.caption || "";
  const editorFontSize = editor
    ? readableTextSize(editor.textSize, overlayText)
    : 21;

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
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050b0e]"
        style={{ touchAction: "none" }}
      >
        <div className="relative h-[100dvh] w-full max-w-[430px] overflow-hidden bg-[#050b0e]">
          <div className="absolute inset-0 overflow-hidden bg-black">
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
                    className="h-full w-full object-cover"
                    style={
                      editor
                        ? {
                            objectPosition: `${editor.cropX}% ${editor.cropY}%`,
                            transform: `scale(${editor.cropScale})`,
                          }
                        : undefined
                    }
                    autoPlay
                    muted
                    playsInline
                    onEnded={goNext}
                  />
                ) : (
                  <img
                    src={currentStory.mediaUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    style={
                      editor
                        ? {
                            objectPosition: `${editor.cropX}% ${editor.cropY}%`,
                            transform: `scale(${editor.cropScale})`,
                          }
                        : undefined
                    }
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/65 via-black/25 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

          <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top)+14px)] z-40 flex gap-1">
            {currentAuthor.stories.map((_, i) => (
              <div
                key={i}
                className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35 shadow-sm"
              >
                <div
                  className="h-full rounded-full bg-white transition-none"
                  style={{
                    width:
                      i < storyIdx
                        ? "100%"
                        : i === storyIdx
                          ? `${progress}%`
                          : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top)+34px)] z-40 flex items-center gap-2">
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-white/80 bg-gray-300 shadow-sm">
              {currentAuthor.avatarUrl ? (
                <img
                  src={currentAuthor.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-400 to-teal-600">
                  <span className="text-sm font-bold text-white">
                    {currentAuthor.name[0]}
                  </span>
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <p className="truncate text-[16px] font-bold text-white drop-shadow">
                {currentAuthor.name}
              </p>
              <p className="whitespace-nowrap text-[15px] text-white/80 drop-shadow">
                {timeAgo(currentStory.createdAt)}
              </p>
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
              className="flex h-9 w-9 items-center justify-center text-white"
            >
              <MoreHorizontal className="h-7 w-7 drop-shadow" />
            </button>
            <button
              onClick={onClose}
              aria-label="閉じる"
              className="flex h-10 w-10 items-center justify-center text-white"
            >
              <X className="h-9 w-9 drop-shadow" strokeWidth={1.8} />
            </button>
          </div>

          {showMenu && (
            <div className="absolute right-4 top-[calc(env(safe-area-inset-top)+82px)] z-50 w-44 overflow-hidden rounded-lg border border-white/15 bg-black/75 text-white shadow-2xl backdrop-blur-md">
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
                className="w-full border-t border-white/10 px-4 py-3 text-left text-sm text-white/75 active:bg-white/10"
              >
                キャンセル
              </button>
            </div>
          )}

          {overlayText && (
            <div
              className={
                editor
                  ? "absolute z-40 -translate-x-1/2 -translate-y-1/2"
                  : "absolute bottom-[calc(env(safe-area-inset-bottom)+124px)] inset-x-8 z-40"
              }
              style={
                editor
                  ? {
                      left: `${editor.textX}%`,
                      top: `${editor.textY}%`,
                      maxWidth: "94%",
                    }
                  : undefined
              }
            >
              <p
                className="text-center font-bold leading-tight drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)]"
                style={
                  editor
                    ? {
                        color: editor.textColor,
                        fontSize: `${editorFontSize}px`,
                        maxWidth: "94vw",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "pre",
                      }
                    : {
                        color: "white",
                        fontSize: "21px",
                        whiteSpace: "pre-wrap",
                      }
                }
              >
                {overlayText}
              </p>
            </div>
          )}

          <button
            aria-label="前のストーリー"
            className="absolute bottom-16 left-0 top-24 z-20 w-1/3"
            onPointerDown={() => setPaused(true)}
            onPointerCancel={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
            onPointerUp={() => releaseAnd(goPrev)}
          />
          <button
            aria-label="次のストーリー"
            className="absolute bottom-16 right-0 top-24 z-20 w-1/3"
            onPointerDown={() => setPaused(true)}
            onPointerCancel={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
            onPointerUp={() => releaseAnd(goNext)}
          />

          {authorIdx > 0 && (
            <button
              onClick={() => {
                setAuthorIdx(a => a - 1);
                setStoryIdx(0);
                setProgress(0);
              }}
              className="absolute left-2 top-1/2 z-30 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white md:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {authorIdx < authors.length - 1 && (
            <button
              onClick={() => {
                setAuthorIdx(a => a + 1);
                setStoryIdx(0);
                setProgress(0);
              }}
              className="absolute right-2 top-1/2 z-30 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white md:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
