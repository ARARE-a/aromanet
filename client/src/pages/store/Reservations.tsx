import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, Home, Users, TrendingUp, MessageCircle } from "lucide-react";
import { AromaLayout, StatusBadge, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, addDays, subDays } from "date-fns";
import { ja } from "date-fns/locale";

const navItems = [
  { href: "/store/dashboard", icon: <Home className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Home className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "ホーム" },
  { href: "/store/reservations", icon: <Calendar className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Calendar className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "予約" },
  { href: "/store/therapists", icon: <Users className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Users className="w-[26px] h-[26px]" strokeWidth={2.5} />, label: "スタッフ" },
  { href: "/store/sales", icon: <TrendingUp className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <TrendingUp className="w-[26px] h-[26px]" strokeWidth={2.5} />, label: "売上" },
  { href: "/messages", icon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "DM" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "pending", label: "確認待ち" },
  { value: "confirmed", label: "確定" },
  { value: "in_service", label: "施術中" },
  { value: "completed", label: "完了" },
  { value: "cancelled", label: "キャンセル" },
];

export default function StoreReservations() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [date, setDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "store")) navigate("/store/login");
  }, [session, isLoading]);

  const dateStr = format(date, "yyyy-MM-dd");
  const { data: reservations, refetch } = trpc.reservation.getStoreReservations.useQuery(
    { date: dateStr }, { enabled: !!session }
  );

  const updateStatus = trpc.reservation.updateStatus.useMutation({
    onSuccess: () => { toast.success("ステータスを更新しました"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const list = ((reservations as any[]) ?? []).filter(
    (r: any) => statusFilter === "all" || r.status === statusFilter
  );

  return (
    <AromaLayout title="予約管理" showBack backHref="/store/dashboard" showNav navItems={navItems}>
      {/* Date navigator */}
      <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-border/50">
        <button onClick={() => setDate(subDays(date, 1))} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="font-semibold text-foreground">{format(date, "M月d日（E）", { locale: ja })}</div>
          <div className="text-xs text-muted-foreground">{list.length}件</div>
        </div>
        <button onClick={() => setDate(addDays(date, 1))} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Status filter */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              statusFilter === opt.value
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Reservation list */}
      <div className="px-4 py-2 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">この日の予約はありません</p>
          </div>
        ) : (
          list.map((r: any, i: number) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-4 shadow-luxury"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {r.startTime} - {r.endTime}
                  </div>
                  <div className="text-xs text-muted-foreground">{r.menuName}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <AromaAvatar name={r.customerName} size="sm" />
                <div>
                  <div className="text-sm font-medium text-foreground">{r.customerName ?? "お客様"}</div>
                  <div className="text-xs text-muted-foreground">担当: {r.therapistName ?? "未定"}</div>
                </div>
              </div>
              {r.notes && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mb-3">{r.notes}</div>
              )}
              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {r.status === "pending" && (
                  <>
                    <Button size="sm" className="text-xs h-7 rounded-lg bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => updateStatus.mutate({ id: r.id, status: "confirmed" })}>確定</Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => updateStatus.mutate({ id: r.id, status: "cancelled" })}>キャンセル</Button>
                  </>
                )}
                {r.status === "confirmed" && (
                  <>
                    <Button size="sm" className="text-xs h-7 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => updateStatus.mutate({ id: r.id, status: "in_service" })}>施術開始</Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 rounded-lg text-orange-600 border-orange-200 hover:bg-orange-50"
                      onClick={() => updateStatus.mutate({ id: r.id, status: "no_show" })}>無断キャンセル</Button>
                  </>
                )}
                {r.status === "in_service" && (
                  <Button size="sm" className="text-xs h-7 rounded-lg gradient-luxury text-white"
                    onClick={() => updateStatus.mutate({ id: r.id, status: "completed" })}>施術完了</Button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </AromaLayout>
  );
}
