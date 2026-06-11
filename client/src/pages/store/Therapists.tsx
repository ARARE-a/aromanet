import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Plus, Search, UserX, Star, MessageCircle } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function StoreTherapists() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "store")) navigate("/store/login");
  }, [session, isLoading]);

  const { data: therapists, refetch } = trpc.store.getTherapists.useQuery(undefined, { enabled: !!session });
  const addMut = trpc.aroAuth.therapistRegister.useMutation({
    onSuccess: () => { toast.success("セラピストを追加しました"); setShowAdd(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const list = ((therapists as any[]) ?? []).filter((t: any) =>
    !search || t.displayName?.includes(search)
  );

  return (
    <AromaLayout title="スタッフ管理" showBack backHref="/store/dashboard">
      <div className="px-4 py-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="名前で検索" className="pl-9 h-9 rounded-xl" />
        </div>
        <Button size="sm" className="h-9 rounded-xl gradient-luxury text-white" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" />追加
        </Button>
      </div>
      <div className="px-4 space-y-3">
        {list.map((t: any, i: number) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-luxury flex items-center gap-3">
            <AromaAvatar src={t.profileImageUrl} name={t.displayName} size="md" />
            <div className="flex-1">
              <div className="font-semibold text-foreground text-sm">{t.displayName}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500" />{t.rating?.toFixed(1) ?? "4.5"} · {t.reviewCount ?? 0}件
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg"
                onClick={() => navigate(`/messages?therapistId=${t.id}&storeId=${session?.storeId}&type=store_therapist`)}>
                <MessageCircle className="w-3 h-3 mr-1" />DM
              </Button>
              <Link href={`/therapist/${t.id}`}>
                <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg">プロフィール</Button>
              </Link>
            </div>
          </motion.div>
        ))}
        {list.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <UserX className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">スタッフが登録されていません</p>
          </div>
        )}
      </div>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>セラピスト追加</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>源氏名</Label><Input value={form.displayName} onChange={e => setForm(f => ({...f, displayName: e.target.value}))} className="mt-1 rounded-xl" /></div>
            <div><Label>メールアドレス</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="mt-1 rounded-xl" /></div>
            <div><Label>初期パスワード（8文字以上）</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} className="mt-1 rounded-xl" /></div>
            <Button className="w-full rounded-xl gradient-luxury text-white" onClick={() => addMut.mutate({ ...form, skipEmailVerify: true })} disabled={addMut.isPending}>追加する</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AromaLayout>
  );
}
