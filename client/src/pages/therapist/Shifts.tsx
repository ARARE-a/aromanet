import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Clock, Plus, Trash2 } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function TherapistShifts() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: "", startTime: "10:00", endTime: "22:00" });
  useEffect(() => { if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login"); }, [session, isLoading]);
  const { data: shifts, refetch } = trpc.therapist.getShifts.useQuery({ month: new Date().toISOString().slice(0,7) }, { enabled: !!session });
  const createMut = trpc.therapist.createShift.useMutation({ onSuccess: () => { toast.success("出勤を登録しました"); setShowAdd(false); refetch(); }, onError: e => toast.error(e.message) });
  const list = (shifts as any[]) ?? [];
  return (
    <AromaLayout title="出勤管理" showBack backHref="/therapist/dashboard">
      <div className="px-4 py-3">
        <Button size="sm" className="w-full h-9 rounded-xl gradient-luxury text-white" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" />出勤を登録
        </Button>
      </div>
      <div className="px-4 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><Clock className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">出勤予定がありません</p></div>
        ) : list.map((s: any, i: number) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-luxury flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground">{s.date}</div>
              <div className="text-xs text-muted-foreground">{s.startTime}〜{s.endTime}</div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{s.status === "confirmed" ? "確定" : "申請中"}</span>
          </motion.div>
        ))}
      </div>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>出勤登録</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>日付</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="mt-1 rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>開始時間</Label><Input type="time" value={form.startTime} onChange={e => setForm(f => ({...f, startTime: e.target.value}))} className="mt-1 rounded-xl" /></div>
              <div><Label>終了時間</Label><Input type="time" value={form.endTime} onChange={e => setForm(f => ({...f, endTime: e.target.value}))} className="mt-1 rounded-xl" /></div>
            </div>
            <Button className="w-full rounded-xl gradient-luxury text-white" onClick={() => createMut.mutate(form)} disabled={createMut.isPending}>登録する</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AromaLayout>
  );
}
