import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subMonths, addMonths } from "date-fns";
import { ja } from "date-fns/locale";

export default function StoreSales() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "store")) navigate("/store/login");
  }, [session, isLoading]);

  const monthStr = format(month, "yyyy-MM");
  const { data: summary } = trpc.sales.getStoreSummary.useQuery({ month: monthStr }, { enabled: !!session });
  const { data: dailySales } = trpc.sales.getDailySales.useQuery({ month: monthStr }, { enabled: !!session });

  const s = summary as any;
  const daily = (dailySales as any[]) ?? [];

  const chartData = daily.map((d: any) => ({
    day: d.date?.slice(-2),
    amount: Math.round((d.totalAmount ?? 0) / 1000),
  }));

  return (
    <AromaLayout title="売上管理" showBack backHref="/store/dashboard">
      {/* Month navigator */}
      <div className="px-4 py-3 flex items-center justify-between">
        <button onClick={() => setMonth(subMonths(month, 1))} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-foreground">{format(month, "yyyy年M月", { locale: ja })}</span>
        <button onClick={() => setMonth(addMonths(month, 1))} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "月間売上", value: s?.totalAmount ? `¥${(s.totalAmount / 10000).toFixed(1)}万` : "¥0", color: "text-green-600" },
          { label: "件数", value: `${s?.count ?? 0}件`, color: "text-blue-600" },
          { label: "平均単価", value: s?.count && s?.totalAmount ? `¥${Math.round(s.totalAmount / s.count).toLocaleString()}` : "¥0", color: "text-purple-600" },
          { label: "キャンセル率", value: s?.cancelRate ? `${(s.cancelRate * 100).toFixed(1)}%` : "0%", color: "text-red-500" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white rounded-2xl p-4 shadow-luxury">
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="mx-4 bg-white rounded-2xl p-4 shadow-luxury mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">日別売上（千円）</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => [`¥${v}千`, "売上"]} />
              <Bar dataKey="amount" fill="oklch(0.35 0.08 195)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Daily breakdown */}
      <div className="px-4 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">日別明細</h3>
        {daily.map((d: any) => (
          <div key={d.date} className="bg-white rounded-xl p-3 shadow-luxury flex items-center justify-between">
            <span className="text-sm text-foreground">{d.date?.slice(5)}</span>
            <div className="text-right">
              <div className="text-sm font-semibold text-foreground">¥{(d.totalAmount ?? 0).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{d.count ?? 0}件</div>
            </div>
          </div>
        ))}
      </div>
    </AromaLayout>
  );
}
