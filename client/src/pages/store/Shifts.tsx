import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Clock, Plus, Trash2 } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function StoreShifts() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  useEffect(() => { if (!isLoading && (!session || session.role !== "store")) navigate("/store/login"); }, [session, isLoading]);
  const { data: shifts } = trpc.store.getShifts.useQuery({ date: new Date().toISOString().slice(0,10) }, { enabled: !!session });
  const list = (shifts as any[]) ?? [];
  return (
    <AromaLayout title="シフト管理" showBack backHref="/store/dashboard">
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
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{s.status === "confirmed" ? "確定" : "申請中"}</span>
          </motion.div>
        ))}
      </div>
    </AromaLayout>
  );
}
