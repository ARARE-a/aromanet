import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Calendar, Heart, TrendingUp, MessageCircle, User, Clock, Image, BookOpen, LogOut, BarChart3 } from "lucide-react";
import { AromaLayout, AromaLogo, AromaAvatar, StatusBadge } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";

const navItems = [
  { href: "/therapist/dashboard", icon: <BarChart3 className="w-5 h-5" />, label: "ホーム" },
  { href: "/therapist/shifts", icon: <Clock className="w-5 h-5" />, label: "出勤" },
  { href: "/therapist/reservations", icon: <Calendar className="w-5 h-5" />, label: "予約" },
  { href: "/therapist/posts", icon: <Image className="w-5 h-5" />, label: "投稿" },
  { href: "/messages", icon: <MessageCircle className="w-5 h-5" />, label: "メッセージ" },
];

export default function TherapistDashboard() {
  const [, navigate] = useLocation();
  const { session, isLoading, refetch } = useSession();
  const logoutMut = trpc.aroAuth.aroLogout.useMutation({ onSuccess: () => { refetch(); navigate("/"); } });
  const { data: profile } = trpc.therapist.getMyProfile.useQuery(undefined, { enabled: !!session });
  const { data: dashboard } = trpc.therapist.getDashboard.useQuery(undefined, { enabled: !!session });

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login");
  }, [session, isLoading]);

  if (isLoading || !session) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const p = profile as any;
  const d = dashboard as any;

  const menuItems = [
    { href: "/therapist/shifts", icon: Clock, label: "出勤管理", color: "bg-blue-50 text-blue-600" },
    { href: "/therapist/reservations", icon: Calendar, label: "予約確認", color: "bg-teal-50 text-teal-600" },
    { href: "/therapist/posts", icon: Image, label: "投稿管理", color: "bg-purple-50 text-purple-600" },
    { href: "/therapist/memos", icon: BookOpen, label: "顧客メモ", color: "bg-pink-50 text-pink-600" },
    { href: "/therapist/sales", icon: TrendingUp, label: "売上確認", color: "bg-green-50 text-green-600" },
    { href: "/therapist/profile", icon: User, label: "プロフィール", color: "bg-gray-50 text-gray-600" },
  ];

  return (
    <AromaLayout showNav navItems={navItems}
      headerRight={<button onClick={() => logoutMut.mutate()} className="p-2 rounded-full hover:bg-muted transition-colors"><LogOut className="w-4 h-4 text-muted-foreground" /></button>}
    >
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <AromaLogo size="sm" />
        <Link href="/therapist/profile"><AromaAvatar name={p?.displayName} src={p?.profileImageUrl} size="sm" /></Link>
      </div>
      <div className="px-4 py-2">
        <h2 className="text-lg font-semibold text-foreground">{p?.displayName ?? "セラピスト"}</h2>
        <p className="text-xs text-muted-foreground">{p?.storeName ?? ""}</p>
      </div>
      <div className="px-4 grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "今月指名", value: String(d?.nominationCount ?? 0), unit: "本", color: "text-blue-600" },
          { label: "今月売上", value: d?.totalAmount ? `¥${Math.round(d.totalAmount/10000)}万` : "¥0", unit: "", color: "text-green-600" },
          { label: "フォロワー", value: String(d?.followerCount ?? 0), unit: "人", color: "text-purple-600" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white rounded-2xl p-3 shadow-luxury text-center">
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}{stat.unit}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="px-4 mb-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">管理メニュー</h3>
        <div className="grid grid-cols-3 gap-3">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.href} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 + 0.2 }}>
                <Link href={item.href}>
                  <div className="bg-white rounded-2xl p-3 shadow-luxury flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer">
                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center`}><Icon className="w-5 h-5" /></div>
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
