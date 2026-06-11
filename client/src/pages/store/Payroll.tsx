import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { FileText, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, subMonths, addMonths } from "date-fns";
import { ja } from "date-fns/locale";

export default function StorePayroll() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [month, setMonth] = useState(new Date());
  useEffect(() => { if (!isLoading && (!session || session.role !== "store")) navigate("/store/login"); }, [session, isLoading]);
  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;
  const { data: payrolls, refetch } = trpc.sales.getTherapistPayrolls.useQuery({ year, month: monthNum }, { enabled: !!session });
  const updateMut = trpc.sales.updatePayroll.useMutation({ onSuccess: () => { toast.success("支払いステータスを更新しました"); refetch(); }, onError: e => toast.error(e.message) });
  const list = (payrolls as any[]) ?? [];
  return (
    <AromaLayout title="給与管理" showBack backHref="/store/dashboard">
      <div className="px-4 py-3 flex items-center justify-between">
        <button onClick={() => setMonth(subMonths(month, 1))} className="p-2 rounded-full hover:bg-muted transition-colors"><ChevronLeft className="w-5 h-5" /></button>
        <span className="font-semibold text-foreground">{format(month, "yyyy年M月", { locale: ja })}</span>
        <button onClick={() => setMonth(addMonths(month, 1))} className="p-2 rounded-full hover:bg-muted transition-colors"><ChevronRight className="w-5 h-5" /></button>
      </div>
      <div className="px-4 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">給与データがありません</p></div>
        ) : list.map((p: any, i: number) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-luxury">
            <div className="flex items-center gap-3 mb-2">
              <AromaAvatar name={p.therapistName} size="sm" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">{p.therapistName}</div>
                <div className="text-xs text-muted-foreground">指名{p.nominationCount ?? 0}本 · バック率{p.backRate ?? 0}%</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{p.paymentStatus === "paid" ? "支払済" : "未払い"}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-bold text-foreground">¥{(p.totalAmount ?? 0).toLocaleString()}</span>
                {p.adjustmentAmount !== 0 && <span className="text-xs text-muted-foreground ml-2">調整{p.adjustmentAmount > 0 ? "+" : ""}{p.adjustmentAmount?.toLocaleString()}</span>}
              </div>
              {p.paymentStatus !== "paid" && (
                <Button size="sm" className="h-7 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => updateMut.mutate({ id: p.id, isPaid: true })}>
                  <CheckCircle className="w-3 h-3 mr-1" />支払い済みにする
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </AromaLayout>
  );
}
