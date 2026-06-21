import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Clock, Heart, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import { toast } from "sonner";
import { AromaAvatar, AromaLayout } from "@/components/AromaLayout";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

export default function StoreDetail() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const storeId = parseInt(params.id ?? "0");
  const { session, isLoading } = useSession();
  const utils = trpc.useUtils();
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading, navigate]);

  const { data: store } = trpc.store.getById.useQuery({ storeId }, { enabled: !!session && !!storeId });
  const { data: menus } = trpc.store.getPublicMenus.useQuery({ storeId }, { enabled: !!session && !!storeId });
  const { data: therapists } = trpc.therapist.getByStore.useQuery({ storeId }, { enabled: !!session && !!storeId });
  const { data: reviews } = trpc.review.getStoreReviews.useQuery({ storeId }, { enabled: !!session && !!storeId });
  const { data: favs } = trpc.customer.getFavorites.useQuery(undefined, { enabled: !!session });

  useEffect(() => {
    const favList = (favs as any[]) ?? [];
    setIsFavorited(favList.some(f => f.targetType === "store" && f.targetId === storeId));
  }, [favs, storeId]);

  const toggleFavMut = trpc.customer.toggleFavorite.useMutation({
    onMutate: () => setIsFavorited(prev => !prev),
    onSuccess: () => utils.customer.getFavorites.invalidate(),
    onError: () => {
      setIsFavorited(prev => !prev);
      toast.error("お気に入りの更新に失敗しました。");
    },
  });

  const s = store as any;
  const menuList = (menus as any[]) ?? [];
  const therapistList = (therapists as any[]) ?? [];
  const reviewList = (reviews as any[]) ?? [];

  return (
    <AromaLayout showBack backHref="/home">
      <div className="relative h-52 bg-gradient-to-br from-teal-800 to-teal-600 flex items-center justify-center overflow-hidden">
        {s?.coverImageUrl ? (
          <img src={s.coverImageUrl} alt={s.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-5xl font-bold text-white/30">{s?.name?.[0]}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white drop-shadow truncate">{s?.name ?? "店舗詳細"}</h1>
            <div className="flex items-center gap-1 text-white/85 text-xs mt-0.5">
              <MapPin className="w-3 h-3" />{s?.area ?? s?.city ?? s?.prefecture ?? "エリア未設定"}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href={`/messages?storeId=${storeId}`}>
              <button className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center active:bg-white/30 transition-colors" aria-label="店舗にメッセージ">
                <MessageCircle className="w-5 h-5 text-white" />
              </button>
            </Link>
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => toggleFavMut.mutate({ targetType: "store", targetId: storeId })}
              className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center active:bg-white/30 transition-colors"
              aria-label="店舗をお気に入り"
            >
              <AnimatePresence mode="wait">
                <motion.div key={isFavorited ? "filled" : "empty"} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Heart className={`w-5 h-5 transition-colors ${isFavorited ? "fill-red-500 text-red-500" : "text-white"}`} />
                </motion.div>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-white border-b border-border/50">
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-semibold">{s?.reviewAvg ? Number(s.reviewAvg).toFixed(1) : "4.5"}</span>
            <span className="text-muted-foreground text-xs">({reviewList.length}件)</span>
          </div>
          {s?.businessHours && (
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Clock className="w-3 h-3" />{s.businessHours}
            </div>
          )}
          {s?.phone && (
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Phone className="w-3 h-3" />{s.phone}
            </div>
          )}
        </div>
        {s?.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.description}</p>}
      </div>

      {therapistList.length > 0 && (
        <section className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">在籍セラピスト</h2>
            <span className="text-xs text-muted-foreground">{therapistList.length}名</span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
            {therapistList.map((t: any) => (
              <Link key={t.id} href={`/therapist/${t.id}`}>
                <motion.div whileTap={{ scale: 0.95 }} className="flex-shrink-0 w-20 cursor-pointer text-center">
                  <AromaAvatar name={t.displayName} src={t.profileImageUrl} size="lg" className="mx-auto mb-1" />
                  <div className="text-xs font-medium text-foreground truncate">{t.displayName}</div>
                  {t.rating && (
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-muted-foreground">{Number(t.rating).toFixed(1)}</span>
                    </div>
                  )}
                </motion.div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {menuList.length > 0 && (
        <section className="px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground mb-2">メニュー</h2>
          <div className="space-y-2">
            {menuList.map((m: any) => (
              <div key={m.id} className="bg-white rounded-xl p-3 shadow-luxury flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.durationMinutes ?? m.duration}分</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-foreground">¥{(m.price ?? 0).toLocaleString()}</div>
                  <Link href={`/my/reservations?storeId=${storeId}&menuId=${m.id}`}>
                    <button className="text-xs text-primary font-medium active:opacity-70">予約する</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {reviewList.length > 0 && (
        <section className="px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground mb-2">口コミ</h2>
          <div className="space-y-2">
            {reviewList.slice(0, 3).map((r: any) => (
              <div key={r.id} className="bg-white rounded-xl p-3 shadow-luxury">
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">{r.rating}.0</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{r.comment}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 px-4 py-3">
        <Link href={`/my/reservations?storeId=${storeId}`}>
          <Button className="w-full h-12 rounded-xl gradient-luxury text-white text-base font-semibold">
            <Calendar className="w-5 h-5 mr-2" />この店舗で予約する
          </Button>
        </Link>
      </div>
    </AromaLayout>
  );
}
