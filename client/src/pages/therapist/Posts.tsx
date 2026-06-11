import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Image, Plus, Trash2, Heart } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function TherapistPosts() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ content: "", postType: "diary" });
  useEffect(() => { if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login"); }, [session, isLoading]);
  const { data: posts, refetch } = trpc.post.getMyPosts.useQuery(undefined, { enabled: !!session });
  const createMut = trpc.post.create.useMutation({ onSuccess: () => { toast.success("投稿しました"); setShowAdd(false); setForm({ content: "", postType: "diary" }); refetch(); }, onError: e => toast.error(e.message) });
  const deleteMut = trpc.post.delete.useMutation({ onSuccess: () => { toast.success("削除しました"); refetch(); }, onError: e => toast.error(e.message) });
  const list = (posts as any[]) ?? [];
  return (
    <AromaLayout title="投稿管理" showBack backHref="/therapist/dashboard">
      <div className="px-4 py-3">
        <Button size="sm" className="w-full h-9 rounded-xl gradient-luxury text-white" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" />新規投稿
        </Button>
      </div>
      <div className="px-4 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><Image className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">投稿がありません</p></div>
        ) : list.map((p: any, i: number) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-luxury">
            <div className="flex items-start justify-between mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.postType === "attendance" ? "bg-teal-100 text-teal-700" : "bg-purple-100 text-purple-700"}`}>{p.postType === "attendance" ? "出勤告知" : "日記"}</span>
              <button onClick={() => deleteMut.mutate({ id: p.id })} className="p-1 text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-foreground">{p.content}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Heart className="w-3 h-3" />{p.likeCount ?? 0} · {p.createdAt?.slice(0,10)}
            </div>
          </motion.div>
        ))}
      </div>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>新規投稿</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>投稿タイプ</Label>
              <Select value={form.postType} onValueChange={v => setForm(f => ({...f, postType: v}))}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="diary">日記</SelectItem><SelectItem value="attendance">出勤告知</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>内容</Label><Textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))} className="mt-1 rounded-xl" rows={5} placeholder="投稿内容を入力..." /></div>
            <Button className="w-full rounded-xl gradient-luxury text-white" onClick={() => createMut.mutate({ content: form.content, postType: form.postType as any })} disabled={createMut.isPending}>投稿する</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AromaLayout>
  );
}
