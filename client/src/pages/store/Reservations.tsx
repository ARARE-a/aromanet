import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, Home, MessageCircle, TrendingUp, Users } from "lucide-react";
import { addDays, format, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { AromaAvatar, AromaLayout, StatusBadge } from "@/components/AromaLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";

const navItems = [
  {
    href: "/store/dashboard",
    icon: <Home className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Home className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "ホーム",
  },
  {
    href: "/store/reservations",
    icon: <Calendar className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Calendar className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "予約",
  },
  {
    href: "/store/therapists",
    icon: <Users className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Users className="w-[26px] h-[26px]" strokeWidth={2.5} />,
    label: "スタッフ",
  },
  {
    href: "/store/sales",
    icon: <TrendingUp className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <TrendingUp className="w-[26px] h-[26px]" strokeWidth={2.5} />,
    label: "売上",
  },
  {
    href: "/messages",
    icon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "DM",
  },
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
  const [statusFilter, setStatusFilter] = useState("pending");

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "store")) navigate("/store/login");
  }, [session, isLoading, navigate]);

  const dateStr = format(date, "yyyy-MM-dd");
  const { data: reservations, refetch } = trpc.reservation.getStoreReservations.useQuery(
    statusFilter === "pending"
      ? { status: "pending", limit: 100 }
      : statusFilter === "all"
        ? { limit: 100 }
        : { date: dateStr, status: statusFilter, limit: 100 },
    { enabled: !!session, refetchOnWindowFocus: true, refetchInterval: 15000 },
  );

  const updateStatus = trpc.reservation.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("予約ステータスを更新しました");
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const list = (reservations as any[]) ?? [];
  const heading =
    statusFilter === "pending" ? "確認待ち一覧" :
      statusFilter === "all" ? "予約一覧" :
        format(date, "M月d日（E）", { locale: ja });

  const emptyText =
    statusFilter === "pending" ? "確認待ちの予約はありません" :
      statusFilter === "all" ? "予約はありません" :
        "この日の予約はありません";

  return (
    <AromaLayout title="予約管理" showBack backHref="/store/dashboard" showNav navItems={navItems}>
      <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-border/50">
        <button
          onClick={() => setDate(subDays(date, 1))}
          disabled={statusFilter === "pending" || statusFilter === "all"}
          className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-30"
          aria-label="前日"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="font-semibold text-foreground">{heading}</div>
          <div className="text-xs text-muted-foreground">{list.length}件</div>
        </div>
        <button
          onClick={() => setDate(addDays(date, 1))}
          disabled={statusFilter === "pending" || statusFilter === "all"}
          className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-30"
          aria-label="翌日"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              statusFilter === opt.value ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-2 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : list.map((r: any, i: number) => (
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
                  {r.date} {r.startTime} - {r.endTime}
                </div>
                <div className="text-xs text-muted-foreground">{r.menuName ?? "メニュー未設定"}</div>
              </div>
              <StatusBadge status={r.status} />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <AromaAvatar name={r.customerName} size="sm" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{r.customerName ?? "お客様"}</div>
                <div className="text-xs text-muted-foreground truncate">担当: {r.therapistName ?? "未定"}</div>
              </div>
            </div>

            {r.notes && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mb-3 whitespace-pre-wrap">{r.notes}</div>
            )}

            <div className="flex gap-2 flex-wrap">
              {r.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    className="text-xs h-7 rounded-lg bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => updateStatus.mutate({ id: r.id, status: "confirmed" })}
                    disabled={updateStatus.isPending}
                  >
                    確定
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => updateStatus.mutate({ id: r.id, status: "cancelled" })}
                    disabled={updateStatus.isPending}
                  >
                    キャンセル
                  </Button>
                </>
              )}
              {r.status === "confirmed" && (
                <>
                  <Button
                    size="sm"
                    className="text-xs h-7 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => updateStatus.mutate({ id: r.id, status: "in_service" })}
                    disabled={updateStatus.isPending}
                  >
                    施術開始
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 rounded-lg text-orange-600 border-orange-200 hover:bg-orange-50"
                    onClick={() => updateStatus.mutate({ id: r.id, status: "no_show" })}
                    disabled={updateStatus.isPending}
                  >
                    無断キャンセル
                  </Button>
                </>
              )}
              {r.status === "in_service" && (
                <Button
                  size="sm"
                  className="text-xs h-7 rounded-lg gradient-luxury text-white"
                  onClick={() => updateStatus.mutate({ id: r.id, status: "completed" })}
                  disabled={updateStatus.isPending}
                >
                  施術完了
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </AromaLayout>
  );
}
