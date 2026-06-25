import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Clock,
  Minus,
  Move,
  Plus,
  Send,
  Type,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StoryUploadProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type EditorState = {
  text: string;
  textColor: string;
  textSize: number;
  textX: number;
  textY: number;
  cropX: number;
  cropY: number;
  cropScale: number;
};

const COLORS = [
  "#ffffff",
  "#111827",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
];
const TEXT_MIN_SIZE = 18;
const TEXT_MAX_SIZE = 64;
const TEXT_STEP = 2;
const POSITION_STEP = 4;

const initialEditor: EditorState = {
  text: "",
  textColor: "#ffffff",
  textSize: 32,
  textX: 50,
  textY: 70,
  cropX: 50,
  cropY: 50,
  cropScale: 1,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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

export function StoryUpload({ open, onClose, onSuccess }: StoryUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState("");
  const [editor, setEditor] = useState<EditorState>(initialEditor);
  const [uploading, setUploading] = useState(false);
  const [draggingText, setDraggingText] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const utils = trpc.useUtils();

  const overlayText = editor.text || caption;
  const overlaySize = readableTextSize(editor.textSize, overlayText);

  const createMut = trpc.story.create.useMutation({
    onSuccess: () => {
      toast.success("ストーリーを投稿しました");
      utils.story.getMyStories.invalidate();
      reset();
      onSuccess?.();
      onClose();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setMediaBlob(null);
    setCaption("");
    setEditor(initialEditor);
    setDraggingText(false);
    activePointerId.current = null;
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) {
      toast.error("30MB以下のファイルを選んでください");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setMediaBlob(file);
    e.target.value = "";
  };

  const updateTextPosition = (clientX: number, clientY: number) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp(((clientX - rect.left) / rect.width) * 100, 6, 94);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 10, 90);
    setEditor(prev => ({ ...prev, textX: x, textY: y }));
  };

  const handleTextPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    activePointerId.current = e.pointerId;
    setDraggingText(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateTextPosition(e.clientX, e.clientY);
  };

  const handleTextPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    updateTextPosition(e.clientX, e.clientY);
  };

  const stopTextDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    activePointerId.current = null;
    setDraggingText(false);
  };

  const moveText = (dx: number, dy: number) => {
    setEditor(prev => ({
      ...prev,
      textX: clamp(prev.textX + dx, 6, 94),
      textY: clamp(prev.textY + dy, 10, 90),
    }));
  };

  const changeTextSize = (delta: number) => {
    setEditor(prev => ({
      ...prev,
      textSize: clamp(prev.textSize + delta, TEXT_MIN_SIZE, TEXT_MAX_SIZE),
    }));
  };

  const handlePost = async () => {
    if (!mediaBlob) {
      toast.error("写真または動画を選択してください");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append(
        "file",
        mediaBlob,
        mediaBlob.type.startsWith("video") ? "story.mp4" : "story.jpg"
      );
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("アップロードに失敗しました");
      const data = await res.json();
      const mediaType = mediaBlob.type.startsWith("video") ? "video" : "image";
      createMut.mutate({
        mediaUrl: data.url,
        mediaType,
        caption: caption || editor.text || undefined,
        editorState: JSON.stringify(editor),
      });
    } catch (err: any) {
      toast.error(err.message ?? "投稿に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80"
          onClick={e => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="max-h-[100dvh] w-full max-w-md overflow-hidden bg-white sm:rounded-t-xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">
                ストーリー作成
              </h3>
              <button
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 active:bg-gray-100"
                aria-label="閉じる"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(100dvh-58px)] space-y-3 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              {previewUrl ? (
                <div
                  ref={previewRef}
                  className="relative mx-auto aspect-[9/16] max-h-[52dvh] overflow-hidden rounded-lg bg-gray-950"
                  style={{ touchAction: "none" }}
                >
                  {mediaBlob?.type.startsWith("video") ? (
                    <video
                      src={previewUrl}
                      className="h-full w-full object-cover"
                      controls
                      playsInline
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: `${editor.cropX}% ${editor.cropY}%`,
                        transform: `scale(${editor.cropScale})`,
                      }}
                    />
                  )}

                  {overlayText && (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="文字をドラッグして位置調整"
                      onPointerDown={handleTextPointerDown}
                      onPointerMove={handleTextPointerMove}
                      onPointerUp={stopTextDrag}
                      onPointerCancel={stopTextDrag}
                      className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 select-none rounded-lg bg-black/20 px-3 py-1 text-center font-bold leading-tight shadow-lg outline-none backdrop-blur-[2px] ${
                        draggingText
                          ? "cursor-grabbing ring-2 ring-white/90"
                          : "cursor-grab"
                      }`}
                      style={{
                        left: `${editor.textX}%`,
                        top: `${editor.textY}%`,
                        maxWidth: "94%",
                        color: editor.textColor,
                        fontSize: `${overlaySize}px`,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textShadow: "0 2px 10px rgba(0,0,0,.78)",
                        touchAction: "none",
                        whiteSpace: "pre",
                      }}
                    >
                      {overlayText}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setPreviewUrl(null);
                      setMediaBlob(null);
                    }}
                    className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white"
                    aria-label="画像を削除"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-[9/16] max-h-[52dvh] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 transition-colors active:border-primary active:text-primary"
                >
                  <Camera className="h-8 w-8" />
                  <p className="text-sm font-medium">写真・動画を選択</p>
                  <p className="text-xs">最大30MB</p>
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="rounded-lg bg-gray-50 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <Type className="h-4 w-4" />
                  文字
                </div>
                <Input
                  value={editor.text}
                  onChange={e => {
                    setEditor(prev => ({ ...prev, text: e.target.value }));
                    setCaption(e.target.value);
                  }}
                  placeholder="画像に載せる文字"
                  className="h-11 rounded-lg bg-white"
                  maxLength={80}
                />

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-gray-600">
                      色
                    </span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {COLORS.map(color => (
                        <button
                          key={color}
                          aria-label={`文字色 ${color}`}
                          onClick={() =>
                            setEditor(prev => ({ ...prev, textColor: color }))
                          }
                          className={`h-7 w-7 rounded-full border ${editor.textColor === color ? "ring-2 ring-primary ring-offset-2" : ""}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-9 text-xs font-medium text-gray-600">
                      サイズ
                    </span>
                    <button
                      onClick={() => changeTextSize(-TEXT_STEP)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
                      aria-label="文字を小さく"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="range"
                      min={TEXT_MIN_SIZE}
                      max={TEXT_MAX_SIZE}
                      step={TEXT_STEP}
                      value={editor.textSize}
                      onChange={e =>
                        setEditor(prev => ({
                          ...prev,
                          textSize: Number(e.target.value),
                        }))
                      }
                      className="min-w-0 flex-1"
                      aria-label="文字サイズ"
                    />
                    <button
                      onClick={() => changeTextSize(TEXT_STEP)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
                      aria-label="文字を大きく"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-right text-xs tabular-nums text-gray-500">
                      {editor.textSize}
                    </span>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Move className="h-3.5 w-3.5" />
                      文字を直接ドラッグ、または矢印で微調整
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span />
                      <button
                        onClick={() => moveText(0, -POSITION_STEP)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
                        aria-label="上へ移動"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <span />
                      <button
                        onClick={() => moveText(-POSITION_STEP, 0)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
                        aria-label="左へ移動"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          setEditor(prev => ({ ...prev, textX: 50, textY: 70 }))
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold shadow-sm"
                        aria-label="中央付近へ戻す"
                      >
                        中
                      </button>
                      <button
                        onClick={() => moveText(POSITION_STEP, 0)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
                        aria-label="右へ移動"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <span />
                      <button
                        onClick={() => moveText(0, POSITION_STEP)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
                        aria-label="下へ移動"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <span />
                    </div>
                  </div>
                </div>
              </div>

              {!mediaBlob?.type.startsWith("video") && previewUrl && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="mb-2 text-sm font-semibold text-gray-800">
                    画像位置
                  </div>
                  <label className="block text-xs text-gray-500">拡大</label>
                  <input
                    type="range"
                    min="1"
                    max="1.8"
                    step="0.05"
                    value={editor.cropScale}
                    onChange={e =>
                      setEditor(prev => ({
                        ...prev,
                        cropScale: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500">
                        左右
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={editor.cropX}
                        onChange={e =>
                          setEditor(prev => ({
                            ...prev,
                            cropX: Number(e.target.value),
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">
                        上下
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={editor.cropY}
                        onChange={e =>
                          setEditor(prev => ({
                            ...prev,
                            cropY: Number(e.target.value),
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                <span>
                  ストーリーは投稿から24時間で自動的に非表示になります
                </span>
              </div>

              <Button
                className="h-12 w-full rounded-lg font-semibold text-white gradient-luxury"
                onClick={handlePost}
                disabled={!previewUrl || uploading || createMut.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                {uploading || createMut.isPending
                  ? "投稿中..."
                  : "ストーリーを投稿する"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
