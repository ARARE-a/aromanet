import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, Plus, Home, PlusSquare, MessageCircle, User } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const navItems = [
  { href: "/therapist/dashboard", icon: <Home className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Home className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "ホーム" },
  { href: "/therapist/shifts", icon: <Clock className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Clock className="w-[26px] h-[26px]" strokeWidth={2.5} />, label: "出勤" },
  { href: "/therapist/posts", icon: <PlusSquare className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <PlusSquare className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "投稿" },
  { href: "/messages", icon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "DM" },
  { href: "/therapist/profile", icon: <User className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <User className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "プロフィール" },
];

export default function TherapistShifts() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [showAdd, setShowAdd] = useState(false);
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), startTime: "10:00", endTime: "22:00" });
  useEffect(() => { if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login"); }, [session, isLoading]);
  const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
  const { data: shifts, refetch } = trpc.therapist.getShifts.useQuery({ month }, { enabled: !!session, refetchOnWindowFocus: true });
  const createMut = trpc.therapist.createShift.useMutation({
    onSuccess: () => {
      toast.success("出勤を登録しました");
      setShowAdd(false);
      if (form.date) setMonthDate(new Date(`${form.date}T00:00:00`));
      refetch();
    },
    onError: e => toast.error(e.message),
  });
  const list = (shifts as any[]) ?? [];
  const shiftStatus = (shift: any) => {
    if (shift.approvalStatus === "approved") return { label: "承認済み", className: "bg-green-100 text-green-700" };
    if (shift.approvalStatus === "rejected") return { label: "却下済み", className: "bg-red-100 text-red-700" };
    const labels: Record<string, { label: string; className: string }> = {
      scheduled: { label: "申請済み", className: "bg-yellow-100 text-yellow-700" },
      working: { label: "出勤中", className: "bg-green-100 text-green-700" },
      off: { label: "休み", className: "bg-gray-100 text-gray-600" },
      holiday: { label: "休み", className: "bg-gray-100 text-gray-600" },
    };
    return labels[shift.status] ?? { label: shift.status, className: "bg-gray-100 text-gray-600" };
  };
  return (
    <AromaLayout title="出勤管理" showBack backHref="/therapist/dashboard" showNav navItems={navItems}>
      <div className="px-4 py-3">
        <Button size="sm" className="w-full h-9 rounded-xl gradient-luxury text-white" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" />出勤を登録
        </Button>
      </div>
      <div className="px-4 py-2 flex items-center justify-between bg-white border-y border-border/50">
        <button onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 rounded-full active:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="font-semibold text-foreground">{monthDate.getFullYear()}年{monthDate.getMonth() + 1}月</div>
          <div className="text-xs text-muted-foreground">{list.length}件</div>
        </div>
        <button onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 rounded-full active:bg-muted">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="px-4 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><Clock className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">この月の出勤予定はありません</p></div>
        ) : list.map((s: any, i: number) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-luxury flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground">{s.date}</div>
              <div className="text-xs text-muted-foreground">{s.startTime}〜{s.endTime}</div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${shiftStatus(s).className}`}>{shiftStatus(s).label}</span>
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
