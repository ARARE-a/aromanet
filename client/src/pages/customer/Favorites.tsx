import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Heart, Image, MapPin, Star, User } from "lucide-react";
import { toast } from "sonner";
import { AromaAvatar, AromaLayout } from "@/components/AromaLayout";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

export default function CustomerFavorites() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading, navigate]);

  const { data: favs, isLoading: favsLoading } = trpc.customer.getFavorites.useQuery(undefined, { enabled: !!session });
  const favList = (favs as any[]) ?? [];

  const toggleFavMut = trpc.customer.toggleFavorite.useMutation({
    onSuccess: (data) => {
      utils.customer.getFavorites.invalidate();
      if (!(data as any).favorited) toast.success("お気に入りから削除しました。");
    },
    onError: () => toast.error("操作に失敗しました。"),
  });

  const storeFavs = favList.filter(f => f.targetType === "store");
  const therapistFavs = favList.filter(f => f.targetType === "therapist");
  const postFavs = favList.filter(f => f.targetType === "post");

  return (
    <AromaLayout title="お気に入り" showBack backHref="/my/page">
      <div className="px-4 py-4 space-y-5 pb-24">
        {favsLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : favList.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center">
              <Heart className="w-8 h-8 text-pink-300" />
            </div>
            <p className="text-sm text-muted-foreground">お気に入りはまだありません</p>
            <Link href="/search" className="text-sm text-primary font-medium">店舗・セラピストを探す</Link>
          </motion.div>
        ) : (
          <>
            {storeFavs.length > 0 && (
              <FavoriteSection icon={<MapPin className="w-4 h-4 text-primary" />} title="お気に入り店舗">
                {storeFavs.map((fav: any, i: number) => (
                  <motion.div key={fav.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <FavoriteStoreCard fav={fav} onRemove={() => toggleFavMut.mutate({ targetType: "store", targetId: fav.targetId })} />
                  </motion.div>
                ))}
              </FavoriteSection>
            )}
            {therapistFavs.length > 0 && (
              <FavoriteSection icon={<User className="w-4 h-4 text-primary" />} title="お気に入りセラピスト">
                {therapistFavs.map((fav: any, i: number) => (
                  <motion.div key={fav.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <FavoriteTherapistCard fav={fav} onRemove={() => toggleFavMut.mutate({ targetType: "therapist", targetId: fav.targetId })} />
                  </motion.div>
                ))}
              </FavoriteSection>
            )}
            {postFavs.length > 0 && (
              <FavoriteSection icon={<Image className="w-4 h-4 text-primary" />} title="保存した投稿">
                {postFavs.map((fav: any, i: number) => (
                  <motion.div key={fav.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <FavoritePostCard fav={fav} onRemove={() => toggleFavMut.mutate({ targetType: "post", targetId: fav.targetId })} />
                  </motion.div>
                ))}
              </FavoriteSection>
            )}
          </>
        )}
      </div>
    </AromaLayout>
  );
}

function FavoriteSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">{icon}{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FavoriteStoreCard({ fav, onRemove }: { fav: any; onRemove: () => void }) {
  const { data: store } = trpc.store.getById.useQuery({ storeId: fav.targetId }, { enabled: !!fav.targetId });
  const s = store as any;
  return (
    <FavoriteCard href={`/store/${fav.targetId}`} onRemove={onRemove} removeLabel="お気に入りから削除">
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {s?.logoUrl ? <img src={s.logoUrl} alt={s.name} className="w-full h-full object-cover" /> : <span className="text-lg font-bold text-teal-600">{s?.name?.[0] ?? "S"}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">{s?.name ?? "読み込み中..."}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {(s?.area || s?.city || s?.prefecture) && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="w-3 h-3" />{s.area ?? s.city ?? s.prefecture}</span>}
          {s?.reviewAvg && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{Number(s.reviewAvg).toFixed(1)}</span>}
        </div>
      </div>
    </FavoriteCard>
  );
}

function FavoriteTherapistCard({ fav, onRemove }: { fav: any; onRemove: () => void }) {
  const { data: therapist } = trpc.therapist.getById.useQuery({ therapistId: fav.targetId }, { enabled: !!fav.targetId });
  const t = therapist as any;
  return (
    <FavoriteCard href={`/therapist/${fav.targetId}`} onRemove={onRemove} removeLabel="お気に入りから削除">
      <AromaAvatar name={t?.displayName} src={t?.profileImageUrl} size="lg" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">{t?.displayName ?? "読み込み中..."}</p>
        {t?.catchphrase && <p className="text-xs text-muted-foreground truncate mt-0.5">{t.catchphrase}</p>}
      </div>
    </FavoriteCard>
  );
}

function FavoritePostCard({ fav, onRemove }: { fav: any; onRemove: () => void }) {
  const { data: post } = trpc.post.getById.useQuery({ id: fav.targetId }, { enabled: !!fav.targetId });
  const p = post as any;
  return (
    <FavoriteCard href={p?.therapistId ? `/therapist/${p.therapistId}` : "/home"} onRemove={onRemove} removeLabel="保存を解除">
      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 overflow-hidden flex-shrink-0">
        {p?.imageUrl ? (
          isVideoUrl(p.imageUrl)
            ? <video src={p.imageUrl} className="w-full h-full object-cover" muted playsInline />
            : <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">POST</div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">{p?.therapistName ?? "投稿"}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p?.content ?? "読み込み中..."}</p>
        {p?.storeName && <p className="text-[11px] text-muted-foreground truncate mt-1">{p.storeName}</p>}
      </div>
    </FavoriteCard>
  );
}

function FavoriteCard({ href, children, onRemove, removeLabel }: { href: string; children: React.ReactNode; onRemove: () => void; removeLabel: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-luxury overflow-hidden">
      <Link href={href}><div className="flex items-center gap-3 p-3">{children}</div></Link>
      <div className="px-3 pb-3">
        <button onClick={onRemove} className="w-full py-1.5 text-xs text-red-400 border border-red-100 rounded-lg active:bg-red-50 transition-colors">{removeLabel}</button>
      </div>
    </div>
  );
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}
