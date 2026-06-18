import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  Home, Search, PlusSquare, Heart, User, Calendar, Clock, Image, MessageCircle,
  TrendingUp, BookOpen, LogOut, ChevronRight, Bell, Settings, BarChart3
} from "lucide-react";
import { AromaLayout, AromaAvatar, StoryAvatar, LevelBadge, StatusBadge } from "@/components/AromaLayout";
import { StoryRing } from "@/components/StoryRing";
import { StoryUpload } from "@/components/StoryUpload";
import { StoryViewer, type StoryAuthor } from "@/components/StoryViewer";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";

const navItems = [
  { href: "/therapist/dashboard", icon: <Home className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Home className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "ホーム" },
  { href: "/therapist/shifts", icon: <Clock className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Clock className="w-[26px] h-[26px]" strokeWidth={2.5} />, label: "出勤" },
  { href: "/therapist/posts", icon: <PlusSquare className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <PlusSquare className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "投稿" },
  { href: "/messages", icon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "DM" },
  { href: "/therapist/profile", icon: <User className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <User className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "プロフィール" },
];

export default function TherapistDashboard() {
  const [, navigate] = useLocation();
  const { session, isLoading, logout } = useSession();
  const handleLogout = async () => { try { await logout(); } catch {} navigate("/"); };

  const { data: profile } = trpc.therapist.getMyProfile.useQuery(undefined, { enabled: !!session });
  const { data: dashboard } = trpc.therapist.getDashboard.useQuery(undefined, { enabled: !!session });
  const { data: myStories } = trpc.story.getMyStories.useQuery(undefined, { enabled: !!session });
  const [storyUploadOpen, setStoryUploadOpen] = useState(false);
  const [viewerAuthors, setViewerAuthors] = useState<StoryAuthor[] | null>(null);

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login");
  }, [session, isLoading]);

  if (isLoading || !session) return (
    <div className="min-h-[100dvh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const p = profile as any;
  const d = dashboard as any;
  const todayReservations = (d?.todayReservations ?? []) as any[];

  return (
    <AromaLayout
      showNav
      navItems={navItems}
      title={p?.displayName ?? "セラピスト"}
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
      {/* Profile summary row */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-4">
        <div className="relative">
          <StoryRing hasStory={!!(myStories && myStories.length > 0)} size="lg"
            onClick={() => {
              if (myStories && myStories.length > 0) {
                setViewerAuthors([{ id: p?.id ?? 0, name: p?.displayName ?? "", avatarUrl: p?.profileImageUrl, role: "therapist", stories: myStories as any }]);
              } else {
                setStoryUploadOpen(true);
              }
            }}>
            <AromaAvatar name={p?.displayName} src={p?.profileImageUrl} size="lg" />
          </StoryRing>
          <button
            onClick={() => setStoryUploadOpen(true)}
            className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-white text-white"
          >
            <span className="text-[14px] leading-none font-bold">+</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-around">
          <div className="text-center">
            <div className="text-[17px] font-bold">{d?.nominationCount ?? 0}</div>
            <div className="text-[11px] text-gray-500">今月指名</div>
          </div>
          <div className="text-center">
            <div className="text-[17px] font-bold">{d?.totalAmount ? `¥${Math.round(d.totalAmount / 1000)}k` : "¥0"}</div>
            <div className="text-[11px] text-gray-500">今月売上</div>
          </div>
          <div className="text-center">
            <div className="text-[17px] font-bold">{d?.followerCount ?? 0}</div>
            <div className="text-[11px] text-gray-500">フォロワー</div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="text-[14px] font-semibold">{p?.displayName}</div>
        {p?.storeName && <div className="text-[12px] text-gray-500">{p.storeName}</div>}
        {p?.catchphrase && <div className="text-[13px] text-gray-600 mt-1">{p.catchphrase}</div>}
        <Link href="/therapist/profile">
          <button className="w-full mt-2 py-1.5 border border-gray-300 rounded-lg text-[13px] font-semibold text-foreground active:bg-gray-50">
            プロフィールを編集（写真・クロップ変更可）
          </button>
        </Link>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-px bg-gray-100 border-b border-gray-100">
        {[
          { label: "今日の予約", value: todayReservations.length, unit: "件", color: "text-primary" },
          { label: "今月給与", value: d?.payroll ? `¥${Math.round(d.payroll / 1000)}k` : "¥0", unit: "", color: "text-green-600" },
          { label: "評価", value: p?.rating?.toFixed(1) ?? "4.5", unit: "★", color: "text-yellow-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white py-3 flex flex-col items-center">
            <div className={`text-[17px] font-bold ${stat.color}`}>{stat.value}{stat.unit}</div>
            <div className="text-[11px] text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Today's reservations */}
      {todayReservations.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold">本日の予約</h2>
            <Link href="/therapist/reservations">
              <span className="text-[13px] text-primary">すべて見る</span>
            </Link>
          </div>
          <div className="space-y-2">
            {todayReservations.slice(0, 3).map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-50">
                <div className="text-[13px] font-medium text-primary w-12">{r.startTime}</div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{r.customerName ?? "顧客"}</div>
                  <div className="text-[11px] text-gray-500">{r.menuName}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick menu grid */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-[14px] font-semibold mb-3">メニュー</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: "/therapist/reservations", icon: <Calendar className="w-6 h-6" />, label: "予約", color: "bg-blue-50 text-blue-600" },
            { href: "/therapist/shifts", icon: <Clock className="w-6 h-6" />, label: "出勤", color: "bg-teal-50 text-teal-600" },
            { href: "/therapist/posts", icon: <Image className="w-6 h-6" />, label: "投稿", color: "bg-purple-50 text-purple-600" },
            { href: "/therapist/memos", icon: <BookOpen className="w-6 h-6" />, label: "顧客メモ", color: "bg-pink-50 text-pink-600" },
            { href: "/therapist/sales", icon: <TrendingUp className="w-6 h-6" />, label: "売上", color: "bg-green-50 text-green-600" },
            { href: "/therapist/affiliations", icon: <Heart className="w-6 h-6" />, label: "所属店舗", color: "bg-red-50 text-red-500" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileTap={{ scale: 0.94 }}
                className={`rounded-2xl p-3 flex flex-col items-center gap-1.5 cursor-pointer ${item.color} bg-opacity-60`}
              >
                {item.icon}
                <span className="text-[11px] font-medium">{item.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* Story Upload Dialog */}
      <StoryUpload open={storyUploadOpen} onClose={() => setStoryUploadOpen(false)} />

      {/* Story Viewer */}
      {viewerAuthors && (
        <StoryViewer
          authors={viewerAuthors}
          onClose={() => setViewerAuthors(null)}
        />
      )}
    </AromaLayout>
  );
}
