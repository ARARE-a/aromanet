import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, DoorOpen, CheckCircle, XCircle } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function StoreRooms() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [showAdd, setShowAdd] = useState(false);
  const [editRoom, setEditRoom] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", capacity: 1 });
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "store")) navigate("/store/login");
  }, [session, isLoading]);

  const { data: rooms } = trpc.room.getMyRooms.useQuery(undefined, { enabled: !!session });
  const list = (rooms as any[]) ?? [];

  const createMut = trpc.room.create.useMutation({
    onSuccess: () => { utils.room.getMyRooms.invalidate(); toast.success("ルームを追加しました"); setShowAdd(false); setForm({ name: "", description: "", capacity: 1 }); },
    onError: e => toast.error(e.message),
  });

  const updateMut = trpc.room.update.useMutation({
    onSuccess: () => { utils.room.getMyRooms.invalidate(); toast.success("更新しました"); setEditRoom(null); },
    onError: e => toast.error(e.message),
  });

  const deleteMut = trpc.room.delete.useMutation({
    onSuccess: () => { utils.room.getMyRooms.invalidate(); toast.success("削除しました"); },
    onError: e => toast.error(e.message),
  });

  const availableCount = list.filter(r => r.isAvailable).length;
  const totalCount = list.length;

  return (
    <AromaLayout title="ルーム管理" showBack backHref="/store/dashboard">
      {/* Summary */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-3 shadow-luxury text-center">
          <div className="text-2xl font-bold text-foreground">{totalCount}</div>
          <div className="text-xs text-muted-foreground">総ルーム数</div>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-luxury text-center">
          <div className="text-2xl font-bold text-teal-600">{availableCount}</div>
          <div className="text-xs text-muted-foreground">空き</div>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-luxury text-center">
          <div className="text-2xl font-bold text-rose-500">{totalCount - availableCount}</div>
          <div className="text-xs text-muted-foreground">使用中</div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <Button size="sm" className="w-full h-9 rounded-xl gradient-luxury text-white" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" />ルームを追加
        </Button>
      </div>

      <div className="px-4 space-y-3 pb-24">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <DoorOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">ルームが登録されていません</p>
          </div>
        ) : (
          list.map((room: any, i: number) => (
            <motion.div key={room.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-4 shadow-luxury">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${room.isAvailable ? "bg-teal-50" : "bg-rose-50"}`}>
                    <DoorOpen className={`w-5 h-5 ${room.isAvailable ? "text-teal-600" : "text-rose-500"}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{room.name}</div>
                    {room.description && <div className="text-xs text-muted-foreground mt-0.5">{room.description}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={room.isAvailable ? "default" : "destructive"} className="text-xs">
                    {room.isAvailable ? (
                      <><CheckCircle className="w-3 h-3 mr-1" />空き</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" />使用中</>
                    )}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">空き状況</span>
                  <Switch
                    checked={room.isAvailable}
                    onCheckedChange={(checked) => updateMut.mutate({ id: room.id, isAvailable: checked })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditRoom(room); setForm({ name: room.name, description: room.description ?? "", capacity: room.capacity ?? 1 }); }}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => { if (confirm(`「${room.name}」を削除しますか？`)) deleteMut.mutate({ id: room.id }); }}
                    className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd || !!editRoom} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditRoom(null); } }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editRoom ? "ルームを編集" : "ルームを追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>ルーム名 <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-xl" placeholder="例：ルームA" />
            </div>
            <div>
              <Label>説明</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 rounded-xl resize-none" rows={2} placeholder="例：スタンダードルーム" />
            </div>
            <div>
              <Label>定員</Label>
              <Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))} className="mt-1 rounded-xl" min={1} max={10} />
            </div>
            <Button
              className="w-full h-11 rounded-xl gradient-luxury text-white font-semibold"
              onClick={() => {
                if (!form.name.trim()) { toast.error("ルーム名を入力してください"); return; }
                if (editRoom) {
                  updateMut.mutate({ id: editRoom.id, name: form.name, description: form.description, capacity: form.capacity });
                } else {
                  createMut.mutate({ name: form.name, description: form.description, capacity: form.capacity });
                }
              }}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {editRoom ? "更新する" : "追加する"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AromaLayout>
  );
}
