import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Star, Clock, Phone, Heart, Calendar, ChevronRight, MessageCircle } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function StoreDetail() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const storeId = parseInt(params.id ?? "0");
  const { session, isLoading } = useSession();
  const utils = trpc.useUtils();

  // Local optimistic favorite state
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading]);

  const { data: store } = trpc.store.getById.useQuery({ storeId }, { enabled: !!session && !!storeId });
  const { data: menus } = trpc.store.getPublicMenus.useQuery({ storeId }, { enabled: !!session && !!storeId });
  const { data: therapists } = trpc.therapist.getByStore.useQuery({ storeId }, { enabled: !!session && !!storeId });
  const { data: reviews } = trpc.review.getStoreReviews.useQuery({ storeId }, { enabled: !!session && !!storeId });
  const { data: favs } = trpc.customer.getFavorites.useQuery(undefined, { enabled: !!session });

  // Sync favorite state from server
  useEffect(() => {
    const favList = (favs as any[]) ?? [];
    const found = favList.some(f => f.targetType === "store" && f.targetId === storeId);
    setIsFavorited(found);
  }, [favs, storeId]);

  const toggleFavMut = trpc.customer.toggleFavorite.useMutation({
    onMutate: () => {
      // Optimistic update
      setIsFavorited(prev => !prev);
    },
    onSuccess: (data) => {
      utils.customer.getFavorites.invalidate();
      // No toast - visual feedback only
    },
    onError: () => {
      // Rollback
      setIsFavorited(prev => !prev);
      toast.error("操作に失敗しました");
    },
  });

  const s = store as any;
  const menuList = (menus as any[]) ?? [];
  const therapistList = (therapists as any[]) ?? [];
  const reviewList = (reviews as any[]) ?? [];

  return (
    <AromaLayout showBack backHref="/home">
      {/* Hero */}
      <div className="relative h-52 bg-gradient-to-br from-teal-800 to-teal-600 flex items-center justify-center overflow-hidden">
        {s?.coverImageUrl ? (
          <img src={s.coverImageUrl} alt={s.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-5xl font-bold text-white/30">{s?.name?.[0]}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-white drop-shadow">{s?.name ?? "店舗名"}</h1>
            <div className="flex items-center gap-1 text-white/80 text-xs mt-0.5">
              <MapPin className="w-3 h-3" />{s?.area}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/messages?storeId=${storeId}`}>
              <button className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center active:bg-white/30 transition-colors">
                <MessageCircle className="w-5 h-5 text-white" />
              </button>
            </Link>
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => toggleFavMut.mutate({ targetType: "store", targetId: storeId })}
              className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center active:bg-white/30 transition-colors"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isFavorited ? "filled" : "empty"}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${isFavorited ? "fill-red-500 text-red-500" : "text-white"}`}
                  />
                </motion.div>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Info bar */}
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

      {/* Therapists */}
      {therapistList.length > 0 && (
        <div className="px-4 py-4">
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
        </div>
      )}

      {/* Menus */}
      {menuList.length > 0 && (
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground mb-2">メニュー</h2>
          <div className="space-y-2">
            {menuList.map((m: any) => (
              <div key={m.id} className="bg-white rounded-xl p-3 shadow-luxury flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.durationMinutes ?? m.duration}分</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">¥{(m.price ?? 0).toLocaleString()}</div>
                  <Link href={`/my/reservations?storeId=${storeId}&menuId=${m.id}`}>
                    <button className="text-xs text-primary hover:underline">予約する</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {reviewList.length > 0 && (
        <div className="px-4 py-3">
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
        </div>
      )}

      {/* CTA */}
      <div className="px-4 py-4 pb-8">
        <Link href={`/my/reservations?storeId=${storeId}`}>
          <Button className="w-full h-12 rounded-xl gradient-luxury text-white text-base font-semibold">
            <Calendar className="w-5 h-5 mr-2" />予約する
          </Button>
        </Link>
      </div>
    </AromaLayout>
  );
}
