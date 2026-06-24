import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Clock, Minus, Move, Plus, Send, Type, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StoryUploadProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const COLORS = ["#ffffff", "#111827", "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6", "#ec4899"];

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

const initialEditor: EditorState = {
  text: "",
  textColor: "#ffffff",
  textSize: 28,
  textX: 50,
  textY: 70,
  cropX: 50,
  cropY: 50,
  cropScale: 1,
};

export function StoryUpload({ open, onClose, onSuccess }: StoryUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState("");
  const [editor, setEditor] = useState<EditorState>(initialEditor);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

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

  const handleTextDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const update = (clientX: number, clientY: number) => {
      const x = Math.min(92, Math.max(8, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.min(92, Math.max(12, ((clientY - rect.top) / rect.height) * 100));
      setEditor(prev => ({ ...prev, textX: x, textY: y }));
    };
    update(e.clientX, e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePost = async () => {
    if (!mediaBlob) {
      toast.error("写真または動画を選択してください");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", mediaBlob, mediaBlob.type.startsWith("video") ? "story.mp4" : "story.jpg");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
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
          onClick={e => { if (e.target === e.currentTarget) close(); }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="max-h-[96dvh] w-full max-w-sm overflow-hidden rounded-t-3xl bg-white"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">ストーリーを作成</h3>
              <button onClick={close} className="flex h-8 w-8 items-center justify-center text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(96dvh-54px)] space-y-3 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              {previewUrl ? (
                <div ref={previewRef} className="relative mx-auto aspect-[9/16] max-h-[48dvh] overflow-hidden rounded-2xl bg-gray-950">
                  {mediaBlob?.type.startsWith("video") ? (
                    <video src={previewUrl} className="h-full w-full object-cover" controls playsInline />
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
                  {(editor.text || caption) && (
                    <div
                      role="button"
                      tabIndex={0}
                      onPointerDown={handleTextDrag}
                      className="absolute z-20 max-w-[86%] -translate-x-1/2 -translate-y-1/2 touch-none rounded-xl bg-black/15 px-3 py-1 text-center font-bold leading-tight shadow-lg backdrop-blur-[1px]"
                      style={{
                        left: `${editor.textX}%`,
                        top: `${editor.textY}%`,
                        color: editor.textColor,
                        fontSize: `${editor.textSize}px`,
                        textShadow: "0 2px 10px rgba(0,0,0,.75)",
                      }}
                    >
                      {editor.text || caption}
                    </div>
                  )}
                  <button
                    onClick={() => { setPreviewUrl(null); setMediaBlob(null); }}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-[9/16] max-h-[48dvh] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-primary hover:text-primary"
                >
                  <Camera className="h-8 w-8" />
                  <p className="text-sm font-medium">写真・動画を選択</p>
                  <p className="text-xs">最大30MB</p>
                </button>
              )}

              <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

              <div className="rounded-2xl bg-gray-50 p-3">
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
                  className="h-11 rounded-xl bg-white"
                  maxLength={80}
                />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        aria-label={`文字色 ${color}`}
                        onClick={() => setEditor(prev => ({ ...prev, textColor: color }))}
                        className={`h-7 w-7 rounded-full border ${editor.textColor === color ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditor(prev => ({ ...prev, textSize: Math.max(18, prev.textSize - 2) }))} className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                      <Minus className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditor(prev => ({ ...prev, textSize: Math.min(44, prev.textSize + 2) }))} className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <Move className="h-3.5 w-3.5" />
                  プレビュー上の文字をドラッグして位置調整できます。
                </div>
              </div>

              {!mediaBlob?.type.startsWith("video") && previewUrl && (
                <div className="rounded-2xl bg-gray-50 p-3">
                  <div className="mb-2 text-sm font-semibold text-gray-800">トリミング</div>
                  <label className="block text-xs text-gray-500">拡大</label>
                  <input
                    type="range"
                    min="1"
                    max="1.8"
                    step="0.05"
                    value={editor.cropScale}
                    onChange={e => setEditor(prev => ({ ...prev, cropScale: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500">左右</label>
                      <input type="range" min="0" max="100" value={editor.cropX} onChange={e => setEditor(prev => ({ ...prev, cropX: Number(e.target.value) }))} className="w-full" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">上下</label>
                      <input type="range" min="0" max="100" value={editor.cropY} onChange={e => setEditor(prev => ({ ...prev, cropY: Number(e.target.value) }))} className="w-full" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                <span>ストーリーは投稿から24時間で自動的に非表示になります。</span>
              </div>

              <Button
                className="h-12 w-full rounded-xl font-semibold text-white gradient-luxury"
                onClick={handlePost}
                disabled={!previewUrl || uploading || createMut.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                {uploading || createMut.isPending ? "投稿中..." : "ストーリーを投稿する"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
