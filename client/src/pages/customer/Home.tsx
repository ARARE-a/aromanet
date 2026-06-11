import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Search, Bell, Heart, MapPin, Star, Clock, ChevronRight, MessageCircle, User, Home, Bookmark } from "lucide-react";
import { AromaLayout, AromaLogo, AromaAvatar, LevelBadge } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Input } from "@/components/ui/input";

const navItems = [
  { href: "/home", icon: <Home className="w-5 h-5" />, label: "ホーム" },
  { href: "/search", icon: <Search className="w-5 h-5" />, label: "検索" },
  { href: "/my/reservations", icon: <Bookmark className="w-5 h-5" />, label: "予約" },
  { href: "/messages", icon: <MessageCircle className="w-5 h-5" />, label: "メッセージ" },
  { href: "/my/page", icon: <User className="w-5 h-5" />, label: "マイページ" },
];

export default function CustomerHome() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading]);

  const { data: profile } = trpc.customer.getMyProfile.useQuery(undefined, { enabled: !!session });
  const { data: stores } = trpc.store.search.useQuery({ limit: 6 }, { enabled: !!session });
  const { data: therapists } = trpc.therapist.search.useQuery({ limit: 6 }, { enabled: !!session });
  const { data: posts } = trpc.post.getFeed.useQuery({ limit: 10 }, { enabled: !!session });

  const p = profile as any;
  const storeList = (stores as any[]) ?? [];
  const therapistList = (therapists as any[]) ?? [];
  const postList = (posts as any[]) ?? [];

  if (isLoading || !session) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <AromaLayout showNav navItems={navItems}
      headerRight={
        <div className="flex items-center gap-2">
          <Link href="/my/notifications"><button className="p-2 rounded-full hover:bg-muted transition-colors"><Bell className="w-4 h-4 text-muted-foreground" /></button></Link>
          <Link href="/my/page"><AromaAvatar name={p?.displayName} src={p?.profileImageUrl} size="sm" /></Link>
        </div>
      }
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <AromaLogo size="sm" />
        <div className="flex items-center gap-2">
          <LevelBadge level={p?.level ?? 1} />
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 py-2">
        <div className="relative" onClick={() => navigate("/search")}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input readOnly placeholder="エリア・セラピスト名で検索" className="pl-9 h-10 rounded-xl bg-muted/50 cursor-pointer" />
        </div>
      </div>

      {/* SNS Feed - Posts */}
      {postList.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">新着投稿</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
            {postList.map((post: any) => (
              <Link key={post.id} href={`/therapist/${post.therapistId}`}>
                <motion.div whileTap={{ scale: 0.95 }} className="flex-shrink-0 w-24 cursor-pointer">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center overflow-hidden mb-1">
                    {post.imageUrl ? <img src={post.imageUrl} alt="" className="w-full h-full object-cover" /> : <AromaAvatar name={post.therapistName} size="md" />}
                  </div>
                  <div className="text-xs text-foreground font-medium truncate">{post.therapistName}</div>
                  <div className="text-xs text-muted-foreground truncate">{post.content?.slice(0, 15)}</div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Stores */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">おすすめ店舗</h2>
          <Link href="/search"><span className="text-xs text-primary flex items-center gap-0.5">もっと見る<ChevronRight className="w-3 h-3" /></span></Link>
        </div>
        <div className="space-y-3">
          {storeList.map((store: any, i: number) => (
            <motion.div key={store.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Link href={`/store/${store.id}`}>
                <div className="bg-white rounded-2xl p-4 shadow-luxury flex items-center gap-3 active:scale-98 transition-transform cursor-pointer">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center flex-shrink-0">
                    {store.logoUrl ? <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover rounded-xl" /> : <span className="text-lg font-bold text-teal-600">{store.name?.[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm truncate">{store.name}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3" />{store.area}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-medium text-foreground">{store.rating?.toFixed(1) ?? "4.5"}</span>
                      <span className="text-xs text-muted-foreground">({store.reviewCount ?? 0}件)</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recommended Therapists */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">人気セラピスト</h2>
          <Link href="/search?tab=therapist"><span className="text-xs text-primary flex items-center gap-0.5">もっと見る<ChevronRight className="w-3 h-3" /></span></Link>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {therapistList.map((t: any) => (
            <Link key={t.id} href={`/therapist/${t.id}`}>
              <motion.div whileTap={{ scale: 0.95 }} className="flex-shrink-0 w-20 cursor-pointer text-center">
                <AromaAvatar name={t.displayName} src={t.profileImageUrl} size="lg" className="mx-auto mb-1" />
                <div className="text-xs font-medium text-foreground truncate">{t.displayName}</div>
                <div className="flex items-center justify-center gap-0.5 mt-0.5">
                  <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs text-muted-foreground">{t.rating?.toFixed(1) ?? "4.5"}</span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </AromaLayout>
  );
}
