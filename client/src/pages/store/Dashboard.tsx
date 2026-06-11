import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  Home, Calendar, Users, TrendingUp, MessageCircle,
  Clock, LogOut, BarChart3, UserCheck, FileText, Gift, Settings,
  Star, Bell, DoorOpen, ChevronRight
} from "lucide-react";
import { AromaLayout, AromaLogo, AromaAvatar, StatusBadge } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";

const navItems = [
  { href: "/store/dashboard", icon: <Home className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Home className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "ホーム" },
  { href: "/store/reservations", icon: <Calendar className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Calendar className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "予約" },
  { href: "/store/therapists", icon: <Users className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Users className="w-[26px] h-[26px]" strokeWidth={2.5} />, label: "スタッフ" },
  { href: "/store/sales", icon: <TrendingUp className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <TrendingUp className="w-[26px] h-[26px]" strokeWidth={2.5} />, label: "売上" },
  { href: "/messages", icon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "DM" },
];

export default function StoreDashboard() {
  const [, navigate] = useLocation();
  const { session, isLoading, logout } = useSession();
  const handleLogout = async () => { try { await logout(); } catch {} navigate("/"); };

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
    <div className="min-h-[100dvh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const store = storeData as any;
  const today = (todayReservations as any[]) ?? [];
  const summary = salesSummary as any;

  const menuItems = [
    { href: "/store/reservations", icon: <Calendar className="w-6 h-6" />, label: "予約管理", color: "bg-blue-50 text-blue-600" },
    { href: "/store/therapists", icon: <Users className="w-6 h-6" />, label: "スタッフ管理", color: "bg-teal-50 text-teal-600" },
    { href: "/store/shifts", icon: <Clock className="w-6 h-6" />, label: "シフト管理", color: "bg-purple-50 text-purple-600" },
    { href: "/store/sales", icon: <TrendingUp className="w-6 h-6" />, label: "売上管理", color: "bg-green-50 text-green-600" },
    { href: "/store/payroll", icon: <FileText className="w-6 h-6" />, label: "給与管理", color: "bg-orange-50 text-orange-600" },
    { href: "/store/menus", icon: <Gift className="w-6 h-6" />, label: "メニュー管理", color: "bg-pink-50 text-pink-600" },
    { href: "/store/reviews", icon: <Star className="w-6 h-6" />, label: "口コミ管理", color: "bg-yellow-50 text-yellow-600" },
    { href: "/store/customers", icon: <UserCheck className="w-6 h-6" />, label: "顧客管理", color: "bg-indigo-50 text-indigo-600" },
    { href: "/store/rooms", icon: <DoorOpen className="w-6 h-6" />, label: "ルーム管理", color: "bg-cyan-50 text-cyan-600" },
    { href: "/store/affiliations", icon: <Users className="w-6 h-6" />, label: "所属申請", color: "bg-rose-50 text-rose-600" },
    { href: "/store/profile", icon: <Settings className="w-6 h-6" />, label: "店舗設定", color: "bg-gray-50 text-gray-600" },
  ];

  return (
    <AromaLayout
      showNav
      navItems={navItems}
      titleLogo
      headerRight={
        <div className="flex items-center gap-2">
          <Link href="/messages">
            <button className="p-1"><Bell className="w-[26px] h-[26px]" strokeWidth={1.5} /></button>
          </Link>
          <button onClick={handleLogout} className="p-1">
            <LogOut className="w-[22px] h-[22px] text-gray-400" strokeWidth={1.5} />
          </button>
        </div>
      }
    >
      {/* Store header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-4">
        <Link href="/store/profile">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-teal-muted flex items-center justify-center flex-shrink-0 cursor-pointer">
            {store?.logoUrl
              ? <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
              : <span className="text-2xl font-bold text-primary">{store?.name?.[0] ?? "S"}</span>
            }
          </div>
        </Link>
        <div className="flex-1 flex items-center justify-around">
          <div className="text-center">
            <div className="text-[17px] font-bold">{today.length}</div>
            <div className="text-[11px] text-gray-500">本日予約</div>
          </div>
          <div className="text-center">
            <div className="text-[17px] font-bold">{summary?.count ?? 0}</div>
            <div className="text-[11px] text-gray-500">今月件数</div>
          </div>
          <div className="text-center">
            <div className="text-[17px] font-bold">
              {summary?.totalAmount ? `¥${Math.round(summary.totalAmount / 10000)}万` : "¥0"}
            </div>
            <div className="text-[11px] text-gray-500">今月売上</div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="text-[15px] font-bold">{store?.name ?? "店舗ダッシュボード"}</div>
        {store?.area && <div className="text-[12px] text-gray-500">{store.area}</div>}
        <Link href="/store/profile">
          <button className="w-full mt-2 py-1.5 border border-gray-300 rounded-lg text-[13px] font-semibold active:bg-gray-50">
            店舗プロフィールを編集（ロゴ・クロップ変更可）
          </button>
        </Link>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Today's reservations */}
      {today.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold">本日の予約</h2>
            <Link href="/store/reservations">
              <span className="text-[13px] text-primary">すべて見る</span>
            </Link>
          </div>
          <div className="space-y-2">
            {today.slice(0, 3).map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-50">
                <div className="text-[13px] font-medium text-primary w-12">{r.startTime}</div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{r.customerName ?? "顧客"}</div>
                  <div className="text-[11px] text-gray-500">{r.therapistName} · {r.menuName}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick menu grid */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-[14px] font-semibold mb-3">管理メニュー</h2>
        <div className="grid grid-cols-3 gap-3">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileTap={{ scale: 0.94 }}
                className={`rounded-2xl p-3 flex flex-col items-center gap-1.5 cursor-pointer ${item.color}`}
              >
                {item.icon}
                <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

    </AromaLayout>
  );
}
