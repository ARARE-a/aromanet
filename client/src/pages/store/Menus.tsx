import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Gift, Plus, Trash2, Edit } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function StoreMenus() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", duration: "60", price: "", description: "" });
  useEffect(() => { if (!isLoading && (!session || session.role !== "store")) navigate("/store/login"); }, [session, isLoading]);
  const { data: menus, refetch } = trpc.store.getMenus.useQuery(undefined, { enabled: !!session });
  const createMut = trpc.store.createMenu.useMutation({ onSuccess: () => { toast.success("メニューを追加しました"); setShowAdd(false); refetch(); }, onError: e => toast.error(e.message) });
  const deleteMut = trpc.store.deleteMenu.useMutation({ onSuccess: () => { toast.success("削除しました"); refetch(); }, onError: e => toast.error(e.message) });
  const list = (menus as any[]) ?? [];
  return (
    <AromaLayout title="メニュー管理" showBack backHref="/store/dashboard">
      <div className="px-4 py-3">
        <Button size="sm" className="w-full h-9 rounded-xl gradient-luxury text-white" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" />メニューを追加
        </Button>
      </div>
      <div className="px-4 space-y-3">
        {list.map((m: any, i: number) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-luxury">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-foreground text-sm">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.durationMinutes}分 · ¥{(m.price ?? 0).toLocaleString()}</div>
                {m.description && <div className="text-xs text-muted-foreground mt-1">{m.description}</div>}
              </div>
              <button onClick={() => deleteMut.mutate({ id: m.id })} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
        {list.length === 0 && <div className="text-center py-12 text-muted-foreground"><Gift className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">メニューが登録されていません</p></div>}
      </div>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>メニュー追加</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>メニュー名</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="mt-1 rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>時間（分）</Label><Input type="number" value={form.duration} onChange={e => setForm(f => ({...f, duration: e.target.value}))} className="mt-1 rounded-xl" /></div>
              <div><Label>料金（円）</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} className="mt-1 rounded-xl" /></div>
            </div>
            <div><Label>説明</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="mt-1 rounded-xl" rows={3} /></div>
            <Button className="w-full rounded-xl gradient-luxury text-white" onClick={() => createMut.mutate({ name: form.name, durationMinutes: parseInt(form.duration), price: parseInt(form.price), description: form.description })} disabled={createMut.isPending}>追加する</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AromaLayout>
  );
}
