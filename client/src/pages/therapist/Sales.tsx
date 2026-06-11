import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { TrendingUp, ChevronLeft, ChevronRight, Home, Clock, PlusSquare, MessageCircle, User } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";

import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { format, subMonths, addMonths } from "date-fns";
import { ja } from "date-fns/locale";

const navItems = [
  { href: "/therapist/dashboard", icon: <Home className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Home className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "ホーム" },
  { href: "/therapist/shifts", icon: <Clock className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Clock className="w-[26px] h-[26px]" strokeWidth={2.5} />, label: "出勤" },
  { href: "/therapist/posts", icon: <PlusSquare className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <PlusSquare className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "投稿" },
  { href: "/messages", icon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "DM" },
  { href: "/therapist/profile", icon: <User className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <User className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "プロフィール" },
];

export default function TherapistSales() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [month, setMonth] = useState(new Date());
  useEffect(() => { if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login"); }, [session, isLoading]);
  const monthStr = format(month, "yyyy-MM");
  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;
  const { data: summary } = trpc.therapist.getSalesSummary.useQuery({ month: monthStr }, { enabled: !!session });
  const { data: payroll } = trpc.therapist.getPayroll.useQuery({ year, month: monthNum }, { enabled: !!session });
  const s = summary as any;
  const p = payroll as any;
  return (
    <AromaLayout title="売上確認" showBack backHref="/therapist/dashboard" showNav navItems={navItems}>
      <div className="px-4 py-3 flex items-center justify-between">
        <button onClick={() => setMonth(subMonths(month, 1))} className="p-2 rounded-full hover:bg-muted transition-colors"><ChevronLeft className="w-5 h-5" /></button>
        <span className="font-semibold text-foreground">{format(month, "yyyy年M月", { locale: ja })}</span>
        <button onClick={() => setMonth(addMonths(month, 1))} className="p-2 rounded-full hover:bg-muted transition-colors"><ChevronRight className="w-5 h-5" /></button>
      </div>
      <div className="px-4 grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "施術件数", value: `${s?.count ?? 0}件`, color: "text-blue-600" },
          { label: "指名件数", value: `${s?.nominationCount ?? 0}本`, color: "text-purple-600" },
          { label: "売上合計", value: s?.totalSales ? `¥${(s.totalSales/10000).toFixed(1)}万` : "¥0", color: "text-green-600" },
          { label: "給与（見込み）", value: p?.totalAmount ? `¥${(p.totalAmount/10000).toFixed(1)}万` : "¥0", color: "text-teal-600" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white rounded-2xl p-4 shadow-luxury">
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>
      {p && (
        <div className="mx-4 bg-white rounded-2xl p-4 shadow-luxury">
          <h3 className="text-sm font-semibold text-foreground mb-3">給与明細</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">バック率</span><span className="font-medium">{p.backRate ?? 0}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">基本給与</span><span className="font-medium">¥{(p.baseAmount ?? 0).toLocaleString()}</span></div>
            {p.adjustmentAmount !== 0 && <div className="flex justify-between"><span className="text-muted-foreground">調整金</span><span className="font-medium">{p.adjustmentAmount > 0 ? "+" : ""}¥{(p.adjustmentAmount ?? 0).toLocaleString()}</span></div>}
            <div className="flex justify-between border-t border-border/50 pt-2"><span className="font-semibold">合計</span><span className="font-bold text-teal-600">¥{(p.totalAmount ?? 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">支払い状況</span><span className={`font-medium ${p.paymentStatus === "paid" ? "text-green-600" : "text-yellow-600"}`}>{p.paymentStatus === "paid" ? "支払済" : "未払い"}</span></div>
          </div>
        </div>
      )}
    </AromaLayout>
  );
}
