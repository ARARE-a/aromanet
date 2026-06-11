import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Star, Clock, Phone, Heart, MessageCircle, ChevronRight, Calendar } from "lucide-react";
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

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading]);

  const { data: store } = trpc.store.getById.useQuery({ storeId: storeId }, { enabled: !!session && !!storeId });
  const { data: menus } = trpc.store.getPublicMenus.useQuery({ storeId }, { enabled: !!session && !!storeId });
  const { data: therapists } = trpc.therapist.getByStore.useQuery({ storeId }, { enabled: !!session && !!storeId });
  const { data: reviews } = trpc.review.getStoreReviews.useQuery({ storeId: storeId }, { enabled: !!session && !!storeId });

  const toggleFavMut = trpc.customer.toggleFavorite.useMutation({
    onSuccess: () => toast.success("お気に入りを更新しました"),
    onError: e => toast.error(e.message),
  });

  const s = store as any;
  const menuList = (menus as any[]) ?? [];
  const therapistList = (therapists as any[]) ?? [];

  return (
    <AromaLayout showBack backHref="/home">
      {/* Hero */}
      <div className="relative h-48 bg-gradient-to-br from-teal-800 to-teal-600 flex items-center justify-center">
        {s?.coverImageUrl ? (
          <img src={s.coverImageUrl} alt={s.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-4xl font-bold text-white/80">{s?.name?.[0]}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{s?.name ?? "店舗名"}</h1>
            <div className="flex items-center gap-1 text-white/80 text-sm mt-0.5">
              <MapPin className="w-3 h-3" />{s?.area}
            </div>
          </div>
          <button onClick={() => toggleFavMut.mutate({ targetType: "store", targetId: storeId })}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-3 bg-white border-b border-border/50">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-semibold">{s?.rating?.toFixed(1) ?? "4.5"}</span>
            <span className="text-muted-foreground">({s?.reviewCount ?? 0}件)</span>
          </div>
          {s?.businessHours && <div className="flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3" />{s.businessHours}</div>}
          {s?.phone && <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{s.phone}</div>}
        </div>
        {s?.description && <p className="text-sm text-muted-foreground mt-2">{s.description}</p>}
      </div>

      {/* Menus */}
      {menuList.length > 0 && (
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground mb-2">メニュー</h2>
          <div className="space-y-2">
            {menuList.map((m: any) => (
              <div key={m.id} className="bg-white rounded-xl p-3 shadow-luxury flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.duration}分</div>
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

      {/* Therapists */}
      {therapistList.length > 0 && (
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground mb-2">在籍セラピスト</h2>
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
      )}

      {/* CTA */}
      <div className="px-4 py-4">
        <Link href={`/my/reservations?storeId=${storeId}`}>
          <Button className="w-full h-12 rounded-xl gradient-luxury text-white text-base font-semibold">
            <Calendar className="w-5 h-5 mr-2" />予約する
          </Button>
        </Link>
      </div>
    </AromaLayout>
  );
}
