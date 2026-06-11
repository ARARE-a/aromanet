import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Search, MapPin, Star, SlidersHorizontal, X } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AREAS = ["全エリア", "東京", "大阪", "名古屋", "福岡", "札幌", "横浜", "神戸"];

export default function CustomerSearch() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [tab, setTab] = useState<"store" | "therapist">("store");
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading]);

  const { data: stores } = trpc.store.search.useQuery({ prefecture: area === "全エリア" ? undefined : area, keyword: query || undefined, limit: 20 }, { enabled: !!session });
  const { data: therapists } = trpc.therapist.search.useQuery({ limit: 20 }, { enabled: !!session });

  const storeList = (stores as any[]) ?? [];
  const therapistList = (therapists as any[]) ?? [];

  return (
    <AromaLayout title="検索">
      <div className="px-4 py-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="店舗名・セラピスト名・エリア" className="pl-9 h-10 rounded-xl" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="h-9 rounded-xl text-sm"><SelectValue placeholder="エリア選択" /></SelectTrigger>
              <SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" className="h-9 rounded-xl" onClick={() => setShowFilter(!showFilter)}>
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
        {showFilter && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex gap-2">
            <Input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="最低料金" className="h-9 rounded-xl text-sm" />
            <span className="self-center text-muted-foreground">〜</span>
            <Input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="最高料金" className="h-9 rounded-xl text-sm" />
          </motion.div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-1 mb-3">
        {(["store", "therapist"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${tab === t ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {t === "store" ? "店舗" : "セラピスト"}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3">
        {tab === "store" ? (
          storeList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><Search className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">店舗が見つかりません</p></div>
          ) : storeList.map((store: any, i: number) => (
            <motion.div key={store.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link href={`/store/${store.id}`}>
                <div className="bg-white rounded-2xl p-4 shadow-luxury flex items-center gap-3 cursor-pointer">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center flex-shrink-0">
                    {store.logoUrl ? <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover rounded-xl" /> : <span className="text-lg font-bold text-teal-600">{store.name?.[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm truncate">{store.name}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"><MapPin className="w-3 h-3" />{store.area}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-medium">{store.rating?.toFixed(1) ?? "4.5"}</span>
                      <span className="text-xs text-muted-foreground">({store.reviewCount ?? 0}件)</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        ) : (
          therapistList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><Search className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">セラピストが見つかりません</p></div>
          ) : therapistList.map((t: any, i: number) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link href={`/therapist/${t.id}`}>
                <div className="bg-white rounded-2xl p-4 shadow-luxury flex items-center gap-3 cursor-pointer">
                  <AromaAvatar name={t.displayName} src={t.profileImageUrl} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm">{t.displayName}</div>
                    <div className="text-xs text-muted-foreground">{t.storeName}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-medium">{t.rating?.toFixed(1) ?? "4.5"}</span>
                      <span className="text-xs text-muted-foreground">({t.reviewCount ?? 0}件)</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </AromaLayout>
  );
}
