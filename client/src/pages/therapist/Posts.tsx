import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Grid3X3, BookOpen, Plus, Trash2, Heart, Camera, Image, Video, X } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Tab = "grid" | "diary";

export default function TherapistPosts() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [tab, setTab] = useState<Tab>("grid");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ content: "", postType: "diary" });
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login");
  }, [session, isLoading]);

  const { data: profile } = trpc.therapist.getMyProfile.useQuery(undefined, { enabled: !!session });
  const { data: posts } = trpc.post.getMyPosts.useQuery(undefined, { enabled: !!session });
  const p = profile as any;
  const list = (posts as any[]) ?? [];

  useEffect(() => {
    return () => {
      mediaPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [mediaPreviews]);

  const createMut = trpc.post.create.useMutation({
    onSuccess: () => {
      utils.post.getMyPosts.invalidate();
      toast.success("投稿しました");
      setShowAdd(false);
      setForm({ content: "", postType: "diary" });
      setMediaFiles([]);
      setMediaPreviews(prev => {
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: e => toast.error(e.message),
  });

  const deleteMut = trpc.post.delete.useMutation({
    onSuccess: () => { utils.post.getMyPosts.invalidate(); toast.success("削除しました"); setSelectedPost(null); },
    onError: e => toast.error(e.message),
  });

  const attendancePosts = list.filter(post => post.postType === "attendance");
  const diaryPosts = list.filter(post => post.postType === "diary");

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, 6);
    setMediaPreviews(prev => {
      prev.forEach(url => URL.revokeObjectURL(url));
      return files.map(file => URL.createObjectURL(file));
    });
    setMediaFiles(files);
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadSelectedMedia = async () => {
    const urls: string[] = [];
    for (const file of mediaFiles) {
      const formData = new FormData();
      formData.append("file", file, file.name || "post-media");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "アップロードに失敗しました");
      }
      const data = await res.json();
      urls.push(data.url);
    }
    return urls;
  };

  const handleCreatePost = async () => {
    const content = form.content.trim();
    if (!content && mediaFiles.length === 0) {
      toast.error("本文または写真・動画を追加してください");
      return;
    }
    setIsUploading(true);
    try {
      const imageUrls = await uploadSelectedMedia();
      await createMut.mutateAsync({
        content: content || "写真・動画を投稿しました",
        postType: form.postType as any,
        imageUrls,
      });
    } catch (error: any) {
      toast.error(error?.message ?? "投稿に失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AromaLayout showBack backHref="/therapist/dashboard">
      {/* Social profile header */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-border/30">
        <div className="flex items-start gap-5">
          <AromaAvatar name={p?.displayName} src={p?.profileImageUrl} size="xl" />
          <div className="flex-1">
            <div className="font-bold text-base text-foreground mb-1">{p?.displayName ?? "セラピスト名"}</div>
            <div className="flex gap-5 text-center mb-2">
              <div><div className="font-bold text-sm text-foreground">{list.length}</div><div className="text-xs text-muted-foreground">投稿</div></div>
              <div><div className="font-bold text-sm text-foreground">{attendancePosts.length}</div><div className="text-xs text-muted-foreground">出勤告知</div></div>
              <div><div className="font-bold text-sm text-foreground">{diaryPosts.length}</div><div className="text-xs text-muted-foreground">日記</div></div>
            </div>
            {p?.catchphrase && <p className="text-xs text-muted-foreground">{p.catchphrase}</p>}
          </div>
        </div>

        {/* Story circles */}
        {attendancePosts.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">出勤告知</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
              {attendancePosts.slice(0, 8).map((post: any) => (
                <button key={post.id} onClick={() => setSelectedPost(post)} className="flex-shrink-0 flex flex-col items-center gap-1">
                  <div className="w-14 h-14 rounded-full border-2 border-primary p-0.5">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center">
                      <span className="text-lg">📅</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground truncate w-14 text-center">
                    {new Date(post.createdAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <Button size="sm" className="w-full h-9 rounded-xl gradient-luxury text-white mt-3" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" />新規投稿
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border/30 bg-white sticky top-0 z-10">
        {([
          { key: "grid" as Tab, icon: <Grid3X3 className="w-5 h-5" />, label: "グリッド" },
          { key: "diary" as Tab, icon: <BookOpen className="w-5 h-5" />, label: "日記" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors border-b-2 ${tab === t.key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "grid" ? (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-3 gap-0.5 bg-border/20 pb-24">
            {list.length === 0 ? (
              <div className="col-span-3 flex flex-col items-center gap-2 py-16 text-center">
                <Camera className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">まだ投稿がありません</p>
              </div>
            ) : (
              list.map((post: any, i: number) => (
                <motion.button key={post.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedPost(post)}
                  className="aspect-square bg-white overflow-hidden relative">
                  {post.imageUrl ? (
                    isVideoUrl(post.imageUrl)
                      ? <video src={post.imageUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                      : <img src={post.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-3xl ${post.postType === "attendance" ? "bg-teal-50" : "bg-purple-50"}`}>
                      {post.postType === "attendance" ? "📅" : "📝"}
                    </div>
                  )}
                </motion.button>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div key="diary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-4 py-3 space-y-3 pb-24">
            {diaryPosts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">日記の投稿がありません</p>
              </div>
            ) : (
              diaryPosts.map((post: any, i: number) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl p-4 shadow-luxury">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                    <button onClick={() => deleteMut.mutate({ id: post.id })} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{post.content}</p>
                  {post.imageUrl && (
                    <div className="mt-3 rounded-xl overflow-hidden bg-muted">
                      {isVideoUrl(post.imageUrl)
                        ? <video src={post.imageUrl} className="w-full max-h-80 object-cover" controls playsInline />
                        : <img src={post.imageUrl} alt="" className="w-full max-h-80 object-cover" />}
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Heart className="w-3 h-3" />{post.likeCount ?? 0}
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post detail modal */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelectedPost(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
              onClick={e => e.stopPropagation()}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedPost.postType === "attendance" ? "bg-teal-100 text-teal-700" : "bg-purple-100 text-purple-700"}`}>
                    {selectedPost.postType === "attendance" ? "出勤告知" : "日記"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(selectedPost.createdAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                {selectedPost.imageUrl && (
                  <div className="mb-3 rounded-xl overflow-hidden bg-muted">
                    {isVideoUrl(selectedPost.imageUrl)
                      ? <video src={selectedPost.imageUrl} className="w-full max-h-96 object-cover" controls playsInline />
                      : <img src={selectedPost.imageUrl} alt="" className="w-full max-h-96 object-cover" />}
                  </div>
                )}
                <p className="text-sm text-foreground leading-relaxed">{selectedPost.content}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Heart className="w-3.5 h-3.5" />{selectedPost.likeCount ?? 0}
                  </div>
                  <button onClick={() => deleteMut.mutate({ id: selectedPost.id })}
                    className="text-xs text-red-400 flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" />削除
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" />新規投稿
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={form.postType} onValueChange={v => setForm(f => ({ ...f, postType: v }))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="diary">📝 日記</SelectItem>
                <SelectItem value="attendance">📅 出勤告知</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              className="rounded-xl resize-none"
              rows={5}
              placeholder={form.postType === "attendance" ? "本日の出勤情報を入力..." : "今日の出来事を書いてみましょう..."}
              maxLength={500}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleMediaSelect}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 rounded-xl"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || createMut.isPending}
            >
              <Camera className="w-4 h-4 mr-2" />写真・動画を追加
            </Button>
            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {mediaPreviews.map((url, i) => (
                  <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                    {mediaFiles[i]?.type.startsWith("video/")
                      ? <video src={url} className="w-full h-full object-cover" muted playsInline />
                      : <img src={url} alt="" className="w-full h-full object-cover" />}
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      className="absolute right-1 top-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                      aria-label="メディアを削除"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {mediaFiles[i]?.type.startsWith("video/") && (
                      <div className="absolute left-1 bottom-1 rounded-full bg-black/60 text-white px-1.5 py-0.5">
                        <Video className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground text-right">{form.content.length}/500</p>
            <Button
              className="w-full h-11 rounded-xl gradient-luxury text-white font-semibold"
              onClick={handleCreatePost}
              disabled={isUploading || createMut.isPending || (!form.content.trim() && mediaFiles.length === 0)}
            >
              {isUploading || createMut.isPending ? "投稿中..." : "投稿する"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AromaLayout>
  );
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}
