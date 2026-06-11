import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  Calendar, Users, TrendingUp, Star, MessageCircle,
  Clock, LogOut, BarChart3, UserCheck, FileText, Gift, Settings
} from "lucide-react";
import { AromaLayout, AromaLogo, AromaAvatar, StatusBadge } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";

const navItems = [
  { href: "/store/dashboard", icon: <BarChart3 className="w-5 h-5" />, label: "ホーム" },
  { href: "/store/reservations", icon: <Calendar className="w-5 h-5" />, label: "予約" },
  { href: "/store/therapists", icon: <Users className="w-5 h-5" />, label: "スタッフ" },
  { href: "/store/sales", icon: <TrendingUp className="w-5 h-5" />, label: "売上" },
  { href: "/messages", icon: <MessageCircle className="w-5 h-5" />, label: "メッセージ" },
];

export default function StoreDashboard() {
  const [, navigate] = useLocation();
  const { session, isLoading, refetch } = useSession();
  const logoutMut = trpc.aroAuth.aroLogout.useMutation({ onSuccess: () => { refetch(); navigate("/"); } });
  const { data: storeData } = trpc.store.getMyStore.useQuery(undefined, { enabled: !!session });
  const { data: todayReservations } = trpc.reservation.getStoreReservations.useQuery(
    { date: new Date().toISOString().slice(0, 10) }, { enabled: !!session }
  );
  const { data: salesSummary } = trpc.sales.getStoreSummary.useQuery(
    { month: new Date().toISOString().slice(0, 7) }, { enabled: !!session }
  );

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "store")) navigate("/store/login");
  }, [session, isLoading]);

  if (isLoading || !session) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const store = storeData as any;
  const today = (todayReservations as any[]) ?? [];
  const summary = salesSummary as any;

  const menuItems = [
    { href: "/store/reservations", icon: Calendar, label: "予約管理", color: "bg-blue-50 text-blue-600" },
    { href: "/store/therapists", icon: Users, label: "スタッフ管理", color: "bg-teal-50 text-teal-600" },
    { href: "/store/shifts", icon: Clock, label: "シフト管理", color: "bg-purple-50 text-purple-600" },
    { href: "/store/sales", icon: TrendingUp, label: "売上管理", color: "bg-green-50 text-green-600" },
    { href: "/store/payroll", icon: FileText, label: "給与管理", color: "bg-orange-50 text-orange-600" },
    { href: "/store/menus", icon: Gift, label: "メニュー管理", color: "bg-pink-50 text-pink-600" },
    { href: "/store/reviews", icon: Star, label: "口コミ管理", color: "bg-yellow-50 text-yellow-600" },
    { href: "/store/customers", icon: UserCheck, label: "顧客管理", color: "bg-indigo-50 text-indigo-600" },
    { href: "/store/profile", icon: Settings, label: "店舗設定", color: "bg-gray-50 text-gray-600" },
  ];

  return (
    <AromaLayout showNav navItems={navItems}
      headerRight={
        <button onClick={() => logoutMut.mutate()} className="p-2 rounded-full hover:bg-muted transition-colors">
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      }
    >
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <AromaLogo size="sm" />
        <Link href="/store/profile"><AromaAvatar name={store?.name ?? "店舗"} src={store?.logoUrl} size="sm" /></Link>
      </div>
      <div className="px-4 py-2">
        <h2 className="text-lg font-semibold text-foreground">{store?.name ?? "店舗ダッシュボード"}</h2>
        <p className="text-xs text-muted-foreground">{store?.area ?? ""}</p>
      </div>
      <div className="px-4 grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "今日の予約", value: String(today.length), unit: "件", color: "text-blue-600" },
          { label: "今月売上", value: summary?.totalAmount ? `¥${Math.round(summary.totalAmount / 10000)}万` : "¥0", unit: "", color: "text-green-600" },
          { label: "今月件数", value: String(summary?.count ?? 0), unit: "件", color: "text-purple-600" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white rounded-2xl p-3 shadow-luxury text-center">
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}{stat.unit}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>
      {today.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">本日の予約</h3>
            <Link href="/store/reservations" className="text-xs text-primary">すべて見る</Link>
          </div>
          <div className="space-y-2">
            {today.slice(0, 3).map((r: any) => (
              <div key={r.id} className="bg-white rounded-xl p-3 shadow-luxury flex items-center gap-3">
                <div className="text-sm font-medium text-foreground w-12">{r.startTime}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{r.customerName ?? "お客様"}</div>
                  <div className="text-xs text-muted-foreground">{r.menuName ?? ""}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="px-4 mb-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">管理メニュー</h3>
        <div className="grid grid-cols-3 gap-3">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.href} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 + 0.2 }}>
                <Link href={item.href}>
                  <div className="bg-white rounded-2xl p-3 shadow-luxury flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer">
                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-foreground text-center leading-tight">{item.label}</span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AromaLayout>
  );
}
