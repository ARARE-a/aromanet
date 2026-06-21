import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Bell, Bookmark, Heart, Home, LogOut, MessageCircle, Search, Settings, Shield, Star, User, ChevronRight } from "lucide-react";
import { AromaAvatar, AromaLayout, LevelBadge } from "@/components/AromaLayout";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

const navItems = [
  { href: "/home", icon: <Home className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Home className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "ホーム" },
  { href: "/search", icon: <Search className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Search className="w-[26px] h-[26px]" strokeWidth={2.5} />, label: "検索" },
  { href: "/my/reservations", icon: <Bookmark className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Bookmark className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "予約" },
  { href: "/messages", icon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "DM" },
  { href: "/my/page", icon: <User className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <User className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "マイページ" },
];

export default function CustomerMyPage() {
  const [, navigate] = useLocation();
  const { session, isLoading, logout } = useSession();

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading, navigate]);

  const { data: profile } = trpc.customer.getMyProfile.useQuery(undefined, { enabled: !!session });
  const p = profile as any;

  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate("/");
  };

  if (isLoading || !session) {
    return <div className="min-h-[100dvh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const totalSpent = p?.totalSpent ?? 0;
  const levelThresholds = [0, 0, 30000, 80000, 150000, 300000, 500000, 800000, 1200000, 2000000, 5000000];
  let currentLevel = 1;
  for (let lv = 10; lv >= 1; lv--) {
    if (totalSpent >= (levelThresholds[lv] ?? 0)) { currentLevel = lv; break; }
  }
  const prevThreshold = levelThresholds[currentLevel] ?? 0;
  const nextThreshold = levelThresholds[currentLevel + 1];
  const progress = nextThreshold && nextThreshold > prevThreshold
    ? Math.min(100, Math.max(0, ((totalSpent - prevThreshold) / (nextThreshold - prevThreshold)) * 100))
    : 100;

  return (
    <AromaLayout
      showNav
      navItems={navItems}
      title={p?.displayName ?? p?.nickname ?? "マイページ"}
      headerRight={(
        <Link href="/my/edit-profile">
          <button className="p-1" aria-label="設定"><Settings className="w-[26px] h-[26px]" strokeWidth={1.5} /></button>
        </Link>
      )}
    >
      <div className="px-4 pt-4 pb-3 bg-white">
        <div className="flex items-start gap-5">
          <Link href="/my/edit-profile">
            <div className="cursor-pointer">
              <AromaAvatar name={p?.displayName ?? p?.nickname} src={p?.profileImageUrl ?? p?.avatarUrl} size="xl" />
            </div>
          </Link>
          <div className="flex-1 flex items-center justify-around pt-2">
            <SummaryLink href="/my/reservations" value={p?.reservationCount ?? 0} label="予約" />
            <SummaryLink href="/my/favorites" value={p?.favoriteCount ?? 0} label="お気に入り" />
            <SummaryLink href="/my/level" value={`Lv.${currentLevel}`} label="レベル" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-[14px] font-semibold text-foreground">{p?.displayName ?? p?.nickname}</div>
          {p?.bio && <div className="text-[13px] text-gray-600 mt-0.5 leading-relaxed">{p.bio}</div>}
        </div>

        <div className="mt-3 bg-gray-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <LevelBadge level={currentLevel} />
            <span className="text-[11px] text-gray-500">
              ¥{totalSpent.toLocaleString()} / {nextThreshold ? `¥${nextThreshold.toLocaleString()}` : "MAX"}
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, oklch(0.35 0.08 195), oklch(0.82 0.08 80))" }}
            />
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            {nextThreshold ? `次のレベルまで ¥${Math.max(0, nextThreshold - totalSpent).toLocaleString()}` : "最高レベルです"}
          </div>
        </div>

        <Link href="/my/edit-profile">
          <button className="w-full mt-3 py-1.5 border border-gray-300 rounded-lg text-[13px] font-semibold text-foreground active:bg-gray-50 transition-colors">
            プロフィールを編集
          </button>
        </Link>
      </div>

      <div className="h-px bg-gray-100" />

      <div className="divide-y divide-gray-50 bg-white">
        <MenuItem href="/my/reservations" icon={<Bookmark className="w-5 h-5 text-primary" />} label="予約履歴" />
        <MenuItem href="/my/favorites" icon={<Heart className="w-5 h-5 text-red-500" />} label="お気に入り" />
        <MenuItem href="/my/level" icon={<Star className="w-5 h-5 text-yellow-500" />} label="会員レベル・特典" />
        <MenuItem href="/messages" icon={<MessageCircle className="w-5 h-5 text-blue-500" />} label="メッセージ" />
        <MenuItem href="/my/notifications" icon={<Bell className="w-5 h-5 text-orange-500" />} label="通知" />
        <MenuItem href="/my/verification" icon={<Shield className="w-5 h-5 text-green-600" />} label="本人確認" badge={!p?.isVerified ? "未確認" : undefined} />
      </div>

      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-4 text-red-500 active:bg-red-50 transition-colors bg-white mt-2">
        <LogOut className="w-5 h-5" />
        <span className="text-[14px] font-medium">ログアウト</span>
      </button>
    </AromaLayout>
  );
}

function SummaryLink({ href, value, label }: { href: string; value: string | number; label: string }) {
  return (
    <Link href={href}>
      <div className="text-center rounded-xl px-2 py-1 active:bg-gray-50 cursor-pointer">
        <div className="text-[17px] font-bold text-foreground">{value}</div>
        <div className="text-[12px] text-gray-500">{label}</div>
      </div>
    </Link>
  );
}

function MenuItem({ href, icon, label, badge }: { href: string; icon: React.ReactNode; label: string; badge?: string }) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors cursor-pointer">
        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">{icon}</div>
        <span className="flex-1 text-[14px] text-foreground font-medium">{label}</span>
        {badge && <span className="text-[11px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{badge}</span>}
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </Link>
  );
}
