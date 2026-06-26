import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Calendar, Clock, Home, MessageCircle, PlusSquare, User } from "lucide-react";
import { AromaAvatar, AromaLayout, StatusBadge } from "@/components/AromaLayout";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

const navItems = [
  {
    href: "/therapist/dashboard",
    icon: <Home className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Home className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "ホーム",
  },
  {
    href: "/therapist/shifts",
    icon: <Clock className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Clock className="w-[26px] h-[26px]" strokeWidth={2.5} />,
    label: "出勤",
  },
  {
    href: "/therapist/posts",
    icon: <PlusSquare className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <PlusSquare className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "投稿",
  },
  {
    href: "/messages",
    icon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "DM",
  },
  {
    href: "/therapist/profile",
    icon: <User className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <User className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "プロフィール",
  },
];

export default function TherapistReservations() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login");
  }, [session, isLoading, navigate]);

  const { data: reservations } = trpc.therapist.getReservations.useQuery(
    {},
    { enabled: !!session, refetchOnWindowFocus: true, refetchInterval: 15000 },
  );
  const list = (reservations as any[]) ?? [];

  return (
    <AromaLayout title="予約確認" showBack backHref="/therapist/dashboard" showNav navItems={navItems}>
      <div className="px-4 py-3 bg-white border-b border-border/50">
        <div className="text-sm font-semibold text-foreground">すべての予約</div>
        <div className="text-xs text-muted-foreground">{list.length}件</div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">予約はありません</p>
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
                <div className="text-sm font-semibold text-foreground">{r.date} {r.startTime} - {r.endTime}</div>
                <div className="text-xs text-muted-foreground">{r.menuName ?? "メニュー未設定"}</div>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <div className="flex items-center gap-2">
              <AromaAvatar name={r.customerName} size="sm" />
              <div className="min-w-0 flex-1">
                <span className="text-sm text-foreground">{r.customerName ?? "お客様"}</span>
              </div>
              {r.customerId && (
                <button
                  type="button"
                  onClick={() => navigate(`/messages?customerId=${r.customerId}&type=therapist_customer`)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-primary/25 px-3 text-xs font-semibold text-primary active:bg-primary/5"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  DM
                </button>
              )}
            </div>
            {r.notes && <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 whitespace-pre-wrap">{r.notes}</div>}
            {r.cancelReason && <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg p-2 whitespace-pre-wrap">キャンセル理由: {r.cancelReason}</div>}
          </motion.div>
        ))}
      </div>
    </AromaLayout>
  );
}
