import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Home,
  MessageCircle,
  PlusSquare,
  ReceiptText,
  User,
} from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";

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

const statusLabels: Record<string, string> = {
  pending: "仮予約",
  confirmed: "確定",
  waiting: "来店待ち",
  in_service: "施術中",
  completed: "完了",
  cancelled: "キャンセル",
  no_show: "無断キャンセル",
  change_requested: "変更依頼",
};

function yen(value: number | null | undefined) {
  return `¥${Number(value ?? 0).toLocaleString()}`;
}

function shortYen(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  if (amount >= 10000) return `¥${(amount / 10000).toFixed(1)}万`;
  return yen(amount);
}

function dateLabel(date?: string | null) {
  if (!date) return "";
  return date.replaceAll("-", "/");
}

export default function TherapistSales() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [month, setMonth] = useState(new Date());
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [highlightSection, setHighlightSection] = useState<"payroll" | "details" | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const payrollRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login");
  }, [session, isLoading, navigate]);

  const monthStr = format(month, "yyyy-MM");
  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;
  const { data: summary } = trpc.therapist.getSalesSummary.useQuery({ month: monthStr }, { enabled: !!session });
  const { data: payroll } = trpc.therapist.getPayroll.useQuery({ year, month: monthNum }, { enabled: !!session });
  const { data: salesDetails } = trpc.therapist.getSalesDetails.useQuery({ month: monthStr }, { enabled: !!session });
  const s = summary as any;
  const p = payroll as any;
  const details = (salesDetails as any[]) ?? [];
  const estimatedPay = Number(p?.totalAmount ?? s?.therapistBack ?? 0);

  const focusSection = (section: "payroll" | "details") => {
    const target = section === "payroll" ? payrollRef.current : detailsRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightSection(section);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightSection(null), 1200);
  };

  const stats = [
    { label: "施術件数", value: `${s?.count ?? 0}件`, color: "text-blue-600", target: "details" as const },
    { label: "指名件数", value: `${s?.nominationCount ?? 0}本`, color: "text-purple-600", target: "details" as const },
    { label: "売上合計", value: shortYen(s?.totalSales), color: "text-green-600", target: "details" as const },
    { label: "給与（見込み）", value: shortYen(estimatedPay), color: "text-teal-600", target: "payroll" as const },
  ];

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

  return (
    <AromaLayout title="売上確認" showBack backHref="/therapist/dashboard" showNav navItems={navItems}>
      <div className="px-4 py-3 flex items-center justify-between">
        <button onClick={() => setMonth(subMonths(month, 1))} className="p-2 rounded-full hover:bg-muted transition-colors"><ChevronLeft className="w-5 h-5" /></button>
        <span className="font-semibold text-foreground">{format(month, "yyyy年M月", { locale: ja })}</span>
        <button onClick={() => setMonth(addMonths(month, 1))} className="p-2 rounded-full hover:bg-muted transition-colors"><ChevronRight className="w-5 h-5" /></button>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3 mb-4">
        {stats.map((stat, i) => (
          <motion.button
            key={stat.label}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => focusSection(stat.target)}
            className="bg-white rounded-2xl p-4 shadow-luxury text-left active:scale-[0.99] transition-transform focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </motion.button>
        ))}
      </div>

      {p && (
        <div
          ref={payrollRef}
          className={`mx-4 bg-white rounded-2xl p-4 shadow-luxury mb-4 transition-all ${
            highlightSection === "payroll" ? "ring-2 ring-teal-500/40 bg-teal-50/40" : ""
          }`}
        >
          <h3 className="text-sm font-semibold text-foreground mb-3">給与明細</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">バック率</span><span className="font-medium">{p.backRate ?? 0}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">基本給与</span><span className="font-medium">{yen(p.baseAmount)}</span></div>
            {p.adjustmentAmount !== 0 && <div className="flex justify-between"><span className="text-muted-foreground">調整金</span><span className="font-medium">{p.adjustmentAmount > 0 ? "+" : ""}{yen(p.adjustmentAmount)}</span></div>}
            <div className="flex justify-between border-t border-border/50 pt-2"><span className="font-semibold">合計</span><span className="font-bold text-teal-600">{yen(p.totalAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">支払い状況</span><span className={`font-medium ${p.paymentStatus === "paid" ? "text-green-600" : "text-yellow-600"}`}>{p.paymentStatus === "paid" ? "支払済" : "未払い"}</span></div>
          </div>
        </div>
      )}

      <div ref={detailsRef} className="px-4 pb-24 scroll-mt-20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">売上明細</h3>
          <span className="text-xs text-muted-foreground">{details.length}件</span>
        </div>

        {details.length === 0 ? (
          <div className={`bg-white rounded-2xl p-6 shadow-luxury text-center text-muted-foreground transition-all ${
            highlightSection === "details" ? "ring-2 ring-primary/35 bg-primary/5" : ""
          }`}>
            <ReceiptText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">この月の売上明細はありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {details.map((sale, i) => {
              const isExpanded = expandedSaleId === sale.id;
              return (
                <motion.div key={sale.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl shadow-luxury overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                    className="w-full p-4 flex items-center gap-3 text-left"
                  >
                    <AromaAvatar name={sale.customerName} src={sale.customerImage} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">{sale.customerName ?? "顧客"}</span>
                        {sale.isNomination && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700">指名</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{dateLabel(sale.date)} {sale.startTime} - {sale.endTime}</p>
                      <p className="text-xs text-muted-foreground truncate">{sale.menuName ?? "コース未設定"}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">{yen(sale.totalAmount)}</div>
                      <div className="text-xs text-teal-600">{yen(sale.therapistBack)}</div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/30 px-4 pb-4 pt-3 space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/30 rounded-xl p-2">
                          <div className="text-xs text-muted-foreground">店舗</div>
                          <div className="font-medium truncate">{sale.storeName ?? "-"}</div>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-2">
                          <div className="text-xs text-muted-foreground">予約状態</div>
                          <div className="font-medium">{statusLabels[sale.reservationStatus] ?? sale.reservationStatus ?? "-"}</div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span className="text-muted-foreground">コース売上</span><span>{yen(sale.menuAmount)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">指名料</span><span>{yen(sale.nominationFee)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">オプション</span><span>{yen(sale.optionAmount)}</span></div>
                        {sale.discountAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">割引</span><span>-{yen(sale.discountAmount)}</span></div>}
                        {sale.cancelFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">キャンセル料</span><span>{yen(sale.cancelFee)}</span></div>}
                        <div className="flex justify-between border-t border-border/50 pt-2"><span className="font-semibold">売上合計</span><span className="font-bold">{yen(sale.totalAmount)}</span></div>
                        <div className="flex justify-between"><span className="font-semibold">給与反映額</span><span className="font-bold text-teal-600">{yen(sale.therapistBack)}</span></div>
                      </div>
                      {(sale.customerNote || sale.reservationNote) && (
                        <div className="bg-muted/30 rounded-xl p-3">
                          <div className="text-xs text-muted-foreground mb-1">予約メモ</div>
                          <p className="text-sm whitespace-pre-wrap">{sale.customerNote || sale.reservationNote}</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AromaLayout>
  );
}
