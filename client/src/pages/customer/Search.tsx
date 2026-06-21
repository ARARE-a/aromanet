import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Bookmark, Home, MapPin, MessageCircle, Search, Star, User } from "lucide-react";
import { AromaAvatar, AromaLayout } from "@/components/AromaLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

const AREAS = ["全エリア", "東京都", "大阪府", "愛知県", "福岡県", "北海道", "神奈川県", "兵庫県", "京都府", "広島県", "宮城県"];

const navItems = [
  { href: "/home", icon: <Home className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Home className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "ホーム" },
  { href: "/search", icon: <Search className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Search className="w-[26px] h-[26px]" strokeWidth={2.5} />, label: "検索" },
  { href: "/my/reservations", icon: <Bookmark className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Bookmark className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "予約" },
  { href: "/messages", icon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "DM" },
  { href: "/my/page", icon: <User className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <User className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "マイページ" },
];

export default function CustomerSearch() {
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  const { session, isLoading } = useSession();
  const [tab, setTab] = useState<"store" | "therapist">("store");
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("全エリア");

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const nextTab = params.get("tab");
    if (nextTab === "therapist" || nextTab === "store") setTab(nextTab);
  }, [searchParams]);

  const prefectureFilter = useMemo(() => area === "全エリア" ? undefined : area, [area]);
  const keywordFilter = useMemo(() => query.trim() || undefined, [query]);

  const { data: stores, isLoading: storesLoading } = trpc.store.search.useQuery(
    { prefecture: prefectureFilter, keyword: keywordFilter, limit: 20 },
    { enabled: !!session },
  );
  const { data: therapists, isLoading: therapistsLoading } = trpc.therapist.search.useQuery(
    { prefecture: prefectureFilter, keyword: keywordFilter, limit: 20 },
    { enabled: !!session },
  );

  const storeList = (stores as any[]) ?? [];
  const therapistList = (therapists as any[]) ?? [];
  const loading = tab === "store" ? storesLoading : therapistsLoading;

  return (
    <AromaLayout title="検索" showNav navItems={navItems}>
      <div className="sticky top-0 z-10 bg-background px-4 py-3 space-y-2 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="店舗名・セラピスト名で検索"
            className="pl-9 h-10 rounded-xl bg-white"
          />
        </div>
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="h-10 rounded-xl text-sm bg-white">
            <SelectValue placeholder="エリアを選択" />
          </SelectTrigger>
          <SelectContent>
            {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="px-4 flex gap-1 my-3">
        {(["store", "therapist"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${tab === t ? "bg-primary text-white" : "bg-muted text-muted-foreground active:bg-muted/80"}`}
          >
            {t === "store" ? `店舗 (${storeList.length})` : `セラピスト (${therapistList.length})`}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3 pb-20">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === "store" ? (
          storeList.length === 0 ? (
            <EmptyState text={area !== "全エリア" ? `${area}の店舗が見つかりません` : "店舗が見つかりません"} />
          ) : storeList.map((store: any, i: number) => (
            <motion.div key={store.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link href={`/store/${store.id}`}>
                <div className="bg-white rounded-2xl p-4 shadow-luxury flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {store.logoUrl ? <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" /> : <span className="text-lg font-bold text-teal-600">{store.name?.[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm truncate">{store.name}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3" />{store.prefecture}{store.city}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-medium">{Number(store.reviewAvg ?? 0).toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({store.reviewCount ?? 0}件)</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        ) : (
          therapistList.length === 0 ? (
            <EmptyState text={area !== "全エリア" ? `${area}のセラピストが見つかりません` : "セラピストが見つかりません"} />
          ) : therapistList.map((t: any, i: number) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link href={`/therapist/${t.id}`}>
                <div className="bg-white rounded-2xl p-4 shadow-luxury flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform">
                  <AromaAvatar name={t.displayName} src={t.profileImageUrl} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm">{t.displayName}</div>
                    <div className="text-xs text-muted-foreground">{t.age ? `${t.age}歳` : ""} {t.height ? `${t.height}cm` : ""}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-medium">{Number(t.reviewAvg ?? 0).toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">指名 {t.nominationCount ?? 0}件</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs">詳細</Button>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </AromaLayout>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
