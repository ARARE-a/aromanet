import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  Calendar,
  Clock,
  Heart,
  Home,
  Image,
  LogOut,
  MessageCircle,
  PlusSquare,
  TrendingUp,
  User,
} from "lucide-react";
import { AromaAvatar, AromaLayout, StatusBadge } from "@/components/AromaLayout";
import { StoryRing } from "@/components/StoryRing";
import { StoryUpload } from "@/components/StoryUpload";
import { StoryViewer, type StoryAuthor } from "@/components/StoryViewer";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

const navItems = [
  {
    href: "/therapist/dashboard",
    icon: <Home className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Home className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "ホーム",
  },
  {
    href: "/therapist/shifts",
    icon: <Clock className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Clock className="w-[26px] h-[26px]" strokeWidth={2.5} />,
    label: "出勤",
  },
  {
    href: "/therapist/posts",
    icon: <PlusSquare className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <PlusSquare className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "投稿",
  },
  {
    href: "/messages",
    icon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "DM",
  },
  {
    href: "/therapist/profile",
    icon: <User className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <User className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "プロフィール",
  },
];

export default function TherapistDashboard() {
  const [, navigate] = useLocation();
  const { session, isLoading, logout } = useSession();
  const [storyUploadOpen, setStoryUploadOpen] = useState(false);
  const [viewerAuthors, setViewerAuthors] = useState<StoryAuthor[] | null>(null);

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login");
  }, [session, isLoading, navigate]);

  const { data: profile } = trpc.therapist.getMyProfile.useQuery(undefined, { enabled: !!session });
  const { data: dashboard } = trpc.therapist.getDashboard.useQuery(undefined, { enabled: !!session });
  const { data: myStories } = trpc.story.getMyStories.useQuery(undefined, { enabled: !!session });

  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate("/");
  };

  if (isLoading || !session) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
            <button className="p-1" aria-label="メッセージ">
              <Bell className="w-[26px] h-[26px]" strokeWidth={1.5} />
            </button>
          </Link>
          <button onClick={handleLogout} className="p-1" aria-label="ログアウト">
            <LogOut className="w-[22px] h-[22px] text-gray-400" strokeWidth={1.5} />
          </button>
        </div>
      }
    >
      <div className="px-4 pt-4 pb-3 flex items-center gap-4">
        <div className="relative">
          <StoryRing
            hasStory={!!(myStories && myStories.length > 0)}
            size="lg"
            onClick={() => {
              if (myStories && myStories.length > 0) {
                setViewerAuthors([{ id: p?.id ?? 0, name: p?.displayName ?? "", avatarUrl: p?.profileImageUrl, role: "therapist", stories: myStories as any }]);
              } else {
                setStoryUploadOpen(true);
              }
            }}
          >
            <AromaAvatar name={p?.displayName} src={p?.profileImageUrl} size="lg" />
          </StoryRing>
          <button
            onClick={() => setStoryUploadOpen(true)}
            className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-white text-white"
            aria-label="ストーリー追加"
          >
            <span className="text-[14px] leading-none font-bold">+</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-around">
          <Stat label="今月指名" value={d?.nominationCount ?? 0} />
          <Stat label="今月売上" value={d?.totalAmount ? `¥${Math.round(d.totalAmount / 1000)}k` : "¥0"} />
          <Stat label="フォロワー" value={d?.followerCount ?? 0} />
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="text-[14px] font-semibold">{p?.displayName}</div>
        {p?.storeName && <div className="text-[12px] text-gray-500">{p.storeName}</div>}
        {p?.catchphrase && <div className="text-[13px] text-gray-600 mt-1">{p.catchphrase}</div>}
        {p?.storeId && (
          <Link href={`/messages?storeId=${p.storeId}&type=store_therapist`}>
            <button className="w-full mt-2 py-1.5 border border-primary/30 rounded-lg text-[13px] font-semibold text-primary active:bg-teal-50 flex items-center justify-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              店舗へDM
            </button>
          </Link>
        )}
        <Link href="/therapist/profile">
          <button className="w-full mt-2 py-1.5 border border-gray-300 rounded-lg text-[13px] font-semibold text-foreground active:bg-gray-50">
            プロフィールを編集
          </button>
        </Link>
      </div>

      <div className="h-px bg-gray-100" />

      <div className="grid grid-cols-3 gap-px bg-gray-100 border-b border-gray-100">
        <QuickStat label="今日の予約" value={todayReservations.length} unit="件" color="text-primary" />
        <QuickStat label="今月給与" value={d?.payroll ? `¥${Math.round(d.payroll / 1000)}k` : "¥0"} color="text-green-600" />
        <QuickStat label="評価" value={p?.rating?.toFixed(1) ?? "4.5"} color="text-yellow-500" />
      </div>

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
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{r.customerName ?? "顧客"}</div>
                  <div className="text-[11px] text-gray-500 truncate">{r.menuName}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pt-4 pb-24">
        <h2 className="text-[14px] font-semibold mb-3">メニュー</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: "/therapist/reservations", icon: <Calendar className="w-6 h-6" />, label: "予約", color: "bg-blue-50 text-blue-600" },
            { href: "/therapist/shifts", icon: <Clock className="w-6 h-6" />, label: "出勤", color: "bg-teal-50 text-teal-600" },
            { href: "/therapist/posts", icon: <Image className="w-6 h-6" />, label: "投稿", color: "bg-purple-50 text-purple-600" },
            { href: "/therapist/memos", icon: <BookOpen className="w-6 h-6" />, label: "顧客メモ", color: "bg-pink-50 text-pink-600" },
            { href: "/therapist/sales", icon: <TrendingUp className="w-6 h-6" />, label: "売上", color: "bg-green-50 text-green-600" },
            { href: "/therapist/affiliations", icon: <Heart className="w-6 h-6" />, label: "所属店舗", color: "bg-red-50 text-red-500" },
          ].map(item => (
            <Link key={item.href} href={item.href}>
              <motion.div whileTap={{ scale: 0.94 }} className={`rounded-2xl p-3 flex flex-col items-center gap-1.5 cursor-pointer ${item.color} bg-opacity-60`}>
                {item.icon}
                <span className="text-[11px] font-medium">{item.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      <StoryUpload open={storyUploadOpen} onClose={() => setStoryUploadOpen(false)} />
      {viewerAuthors && <StoryViewer authors={viewerAuthors} onClose={() => setViewerAuthors(null)} />}
    </AromaLayout>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-[17px] font-bold">{value}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  );
}

function QuickStat({ label, value, unit = "", color }: { label: string; value: string | number; unit?: string; color: string }) {
  return (
    <div className="bg-white py-3 flex flex-col items-center">
      <div className={`text-[17px] font-bold ${color}`}>{value}{unit}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  );
}
