import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { AromaLayout, AromaAvatar, StatusBadge } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";

export default function TherapistReservations() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  useEffect(() => { if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login"); }, [session, isLoading]);
  const { data: reservations } = trpc.therapist.getReservations.useQuery({ date: new Date().toISOString().slice(0,10) }, { enabled: !!session });
  const list = (reservations as any[]) ?? [];
  return (
    <AromaLayout title="予約確認" showBack backHref="/therapist/dashboard">
      <div className="px-4 py-3 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">予約はありません</p></div>
        ) : list.map((r: any, i: number) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-luxury">
            <div className="flex items-start justify-between mb-2">
              <div><div className="text-sm font-semibold text-foreground">{r.date} {r.startTime}</div><div className="text-xs text-muted-foreground">{r.menuName}</div></div>
              <StatusBadge status={r.status} />
            </div>
            <div className="flex items-center gap-2">
              <AromaAvatar name={r.customerName} size="sm" />
              <span className="text-sm text-foreground">{r.customerName ?? "お客様"}</span>
            </div>
            {r.notes && <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">{r.notes}</div>}
          </motion.div>
        ))}
      </div>
    </AromaLayout>
  );
}
