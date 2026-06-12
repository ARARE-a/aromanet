import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Send, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface StoryUploadProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StoryUpload({ open, onClose, onSuccess }: StoryUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const createMut = trpc.story.create.useMutation({
    onSuccess: () => {
      toast.success("ストーリーを投稿しました（24時間で自動削除）");
      utils.story.getMyStories.invalidate();
      setPreviewUrl(null);
      setMediaBlob(null);
      setCaption("");
      onSuccess?.();
      onClose();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("50MB以下のファイルを選択してください"); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setMediaBlob(file);
    e.target.value = "";
  };

  const handlePost = async () => {
    if (!mediaBlob) { toast.error("画像または動画を選択してください"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", mediaBlob, mediaBlob.type.startsWith("video") ? "story.mp4" : "story.jpg");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("アップロードに失敗しました");
      const data = await res.json();
      const mediaType = mediaBlob.type.startsWith("video") ? "video" : "image";
      createMut.mutate({ mediaUrl: data.url, mediaType, caption: caption || undefined });
    } catch (err: any) {
      toast.error(err.message ?? "投稿に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setPreviewUrl(null);
    setMediaBlob(null);
    setCaption("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center"
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-sm bg-white rounded-t-3xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">ストーリーを投稿</h3>
              <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Preview */}
              {previewUrl ? (
                <div className="relative aspect-[9/16] max-h-64 rounded-2xl overflow-hidden bg-gray-100">
                  {mediaBlob?.type.startsWith("video") ? (
                    <video src={previewUrl} className="w-full h-full object-cover" controls />
                  ) : (
                    <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => { setPreviewUrl(null); setMediaBlob(null); }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full aspect-[9/16] max-h-64 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors"
                >
                  <Camera className="w-8 h-8" />
                  <p className="text-sm font-medium">写真・動画を選択</p>
                  <p className="text-xs">最大50MB</p>
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Caption */}
              <Input
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="キャプションを追加（任意）"
                className="rounded-xl h-11"
                maxLength={200}
              />

              {/* Expiry notice */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-50 rounded-xl px-3 py-2">
                <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>ストーリーは投稿から<strong>24時間後</strong>に自動削除されます</span>
              </div>

              <Button
                className="w-full h-12 rounded-xl gradient-luxury text-white font-semibold"
                onClick={handlePost}
                disabled={!previewUrl || uploading || createMut.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                {uploading || createMut.isPending ? "投稿中..." : "ストーリーを投稿する"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
