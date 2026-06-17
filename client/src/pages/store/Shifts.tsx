import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { addWeeks, endOfWeek, format, startOfWeek, subWeeks } from "date-fns";
import { ja } from "date-fns/locale";

export default function StoreShifts() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [weekDate, setWeekDate] = useState(() => new Date());
  useEffect(() => { if (!isLoading && (!session || session.role !== "store")) navigate("/store/login"); }, [session, isLoading]);
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
  const { data: shifts } = trpc.store.getShifts.useQuery(
    { startDate: format(weekStart, "yyyy-MM-dd"), endDate: format(weekEnd, "yyyy-MM-dd") },
    { enabled: !!session, refetchOnWindowFocus: true, refetchInterval: 15000 }
  );
  const list = (shifts as any[]) ?? [];
  const shiftStatus = (status: string) => {
    const labels: Record<string, { label: string; className: string }> = {
      scheduled: { label: "申請済み", className: "bg-yellow-100 text-yellow-700" },
      working: { label: "出勤中", className: "bg-green-100 text-green-700" },
      off: { label: "休み", className: "bg-gray-100 text-gray-600" },
      holiday: { label: "休み", className: "bg-gray-100 text-gray-600" },
    };
    return labels[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  };
  return (
    <AromaLayout title="シフト管理" showBack backHref="/store/dashboard">
      <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-border/50">
        <button onClick={() => setWeekDate(d => subWeeks(d, 1))} className="p-2 rounded-full active:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="font-semibold text-foreground">
            {format(weekStart, "M月d日", { locale: ja })} - {format(weekEnd, "M月d日", { locale: ja })}
          </div>
          <div className="text-xs text-muted-foreground">{list.length}件</div>
        </div>
        <button onClick={() => setWeekDate(d => addWeeks(d, 1))} className="p-2 rounded-full active:bg-muted">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="px-4 py-3 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><Clock className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">今週のシフトはありません</p></div>
        ) : list.map((s: any, i: number) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-luxury flex items-center gap-3">
            <AromaAvatar name={s.therapistName} src={s.therapistImage} size="sm" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">{s.therapistName}</div>
              <div className="text-xs text-muted-foreground">{s.date} {s.startTime}〜{s.endTime}</div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${shiftStatus(s.status).className}`}>{shiftStatus(s.status).label}</span>
          </motion.div>
        ))}
      </div>
    </AromaLayout>
  );
}
