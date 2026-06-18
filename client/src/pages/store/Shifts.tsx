import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle, ChevronLeft, ChevronRight, Clock, XCircle } from "lucide-react";
import { addMonths, format, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { AromaAvatar, AromaLayout } from "@/components/AromaLayout";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

export default function StoreShifts() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [monthDate, setMonthDate] = useState(() => new Date());

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "store")) navigate("/store/login");
  }, [session, isLoading, navigate]);

  const month = format(monthDate, "yyyy-MM");
  const { data: shifts, refetch } = trpc.store.getShifts.useQuery(
    { month },
    { enabled: !!session, refetchOnWindowFocus: true, refetchInterval: 15000 },
  );

  const reviewMut = trpc.store.reviewShift.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approved" ? "出勤申請を承認しました" : "出勤申請を却下しました");
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const list = (shifts as any[]) ?? [];

  const shiftStatus = (shift: any) => {
    if (shift.approvalStatus === "approved") return { label: "承認済み", className: "bg-green-100 text-green-700" };
    if (shift.approvalStatus === "rejected") return { label: "却下済み", className: "bg-red-100 text-red-700" };
    return { label: "申請済み", className: "bg-yellow-100 text-yellow-700" };
  };

  return (
    <AromaLayout title="シフト管理" showBack backHref="/store/dashboard">
      <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-border/50">
        <button onClick={() => setMonthDate(d => subMonths(d, 1))} className="p-2 rounded-full active:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="font-semibold text-foreground">
            {format(monthDate, "yyyy年M月", { locale: ja })}
          </div>
          <div className="text-xs text-muted-foreground">{list.length}件</div>
        </div>
        <button onClick={() => setMonthDate(d => addMonths(d, 1))} className="p-2 rounded-full active:bg-muted">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">この月のシフトはありません</p>
          </div>
        ) : list.map((shift: any, index: number) => {
          const status = shiftStatus(shift);
          const isPending = (shift.approvalStatus ?? "pending") === "pending";

          return (
            <motion.div
              key={shift.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-4 shadow-luxury space-y-3"
            >
              <div className="flex items-center gap-3">
                <AromaAvatar name={shift.therapistName} src={shift.therapistImage} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{shift.therapistName}</div>
                  <div className="text-xs text-muted-foreground">{shift.date} {shift.startTime}〜{shift.endTime}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${status.className}`}>
                  {status.label}
                </span>
              </div>

              {isPending && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    className="h-9 rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => reviewMut.mutate({ shiftId: shift.id, action: "approved" })}
                    disabled={reviewMut.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />承認
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-xl border-red-200 text-red-600"
                    onClick={() => reviewMut.mutate({ shiftId: shift.id, action: "rejected" })}
                    disabled={reviewMut.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1" />却下
                  </Button>
                </div>
              )}

              {shift.reviewNote && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2">{shift.reviewNote}</p>
              )}
            </motion.div>
          );
        })}
      </div>
    </AromaLayout>
  );
}
