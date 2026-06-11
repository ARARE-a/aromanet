import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { Star, Heart, MessageCircle, Calendar, Image, ChevronRight, UserPlus } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TherapistDetail() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const therapistId = parseInt(params.id ?? "0");
  const { session, isLoading } = useSession();
  const [activeTab, setActiveTab] = useState<"info" | "posts" | "reviews">("info");
  const [isFav, setIsFav] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading]);

  const { data: therapist } = trpc.therapist.getById.useQuery({ therapistId: therapistId }, { enabled: !!session && !!therapistId });
  const { data: posts } = trpc.post.getFeed.useQuery({ therapistId, limit: 9 }, { enabled: !!session && !!therapistId });
  const { data: favs } = trpc.customer.getFavorites.useQuery(undefined, { enabled: !!session });
  useEffect(() => {
    const list = (favs as any[]) ?? [];
    setIsFav(list.some(f => f.targetType === "therapist" && f.targetId === therapistId));
  }, [favs, therapistId]);

  const toggleFavMut = trpc.customer.toggleFavorite.useMutation({
    onMutate: () => setIsFav(prev => !prev),
    onError: () => { setIsFav(prev => !prev); toast.error("操作に失敗しました"); },
  });
  const toggleFollowMut = trpc.customer.toggleFollow.useMutation({
    onMutate: () => setIsFollowed(prev => !prev),
    onError: () => { setIsFollowed(prev => !prev); toast.error("操作に失敗しました"); },
  });

  const t = therapist as any;
  const postList = (posts as any[]) ?? [];

  return (
    <AromaLayout showBack backHref="/home">
      {/* Profile header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-4">
          <AromaAvatar name={t?.displayName} src={t?.profileImageUrl} size="xl" />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{t?.displayName ?? "セラピスト"}</h1>
            <p className="text-xs text-muted-foreground">{t?.storeName}</p>
            {t?.catchphrase && <p className="text-sm text-foreground mt-1 italic">"{t.catchphrase}"</p>}
            <div className="flex items-center gap-3 mt-2">
              <div className="text-center">
                <div className="text-sm font-bold text-foreground">{t?.followerCount ?? 0}</div>
                <div className="text-xs text-muted-foreground">フォロワー</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-foreground">{t?.reviewCount ?? 0}</div>
                <div className="text-xs text-muted-foreground">口コミ</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-bold text-foreground">{t?.rating?.toFixed(1) ?? "4.5"}</span>
                </div>
                <div className="text-xs text-muted-foreground">評価</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Button className={`flex-1 h-9 rounded-xl text-sm font-semibold transition-all ${isFollowed ? "bg-muted text-foreground border border-border" : "gradient-luxury text-white"}`}
            onClick={() => toggleFollowMut.mutate({ targetType: "therapist", targetId: therapistId })}>
            <UserPlus className="w-4 h-4 mr-1" />{isFollowed ? "フォロー中" : "フォロー"}
          </Button>
          <motion.button whileTap={{ scale: 0.8 }} onClick={() => toggleFavMut.mutate({ targetType: "therapist", targetId: therapistId })}
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <Heart className={`w-4 h-4 transition-colors ${isFav ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          </motion.button>
          <Link href={`/messages?therapistId=${therapistId}`}>
            <button className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
            </button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50">
        {(["info", "posts", "reviews"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
            {tab === "info" ? "プロフィール" : tab === "posts" ? "投稿" : "口コミ"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-3">
        {activeTab === "info" && (
          <div className="space-y-3">
            {t?.selfIntroduction && (
              <div className="bg-white rounded-2xl p-4 shadow-luxury">
                <h3 className="text-sm font-semibold text-foreground mb-2">自己紹介</h3>
                <p className="text-sm text-muted-foreground">{t.selfIntroduction}</p>
              </div>
            )}
            <div className="bg-white rounded-2xl p-4 shadow-luxury">
              <h3 className="text-sm font-semibold text-foreground mb-2">プロフィール</h3>
              <div className="space-y-2 text-sm">
                {t?.age && <div className="flex justify-between"><span className="text-muted-foreground">年齢</span><span>{t.age}歳</span></div>}
                {t?.height && <div className="flex justify-between"><span className="text-muted-foreground">身長</span><span>{t.height}cm</span></div>}
                {t?.bodyType && <div className="flex justify-between"><span className="text-muted-foreground">スタイル</span><span>{t.bodyType}</span></div>}
              </div>
            </div>
            <Link href={`/my/reservations?therapistId=${therapistId}`}>
              <Button className="w-full h-12 rounded-xl gradient-luxury text-white text-base font-semibold">
                <Calendar className="w-5 h-5 mr-2" />この子を指名して予約
              </Button>
            </Link>
          </div>
        )}

        {activeTab === "posts" && (
          <div className="grid grid-cols-3 gap-1">
            {postList.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-muted-foreground"><Image className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">投稿がありません</p></div>
            ) : postList.map((post: any) => (
              <motion.div key={post.id} whileTap={{ scale: 0.95 }}
                className="aspect-square bg-gradient-to-br from-teal-100 to-teal-200 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer">
                {post.imageUrl ? <img src={post.imageUrl} alt="" className="w-full h-full object-cover" /> : (
                  <div className="p-2 text-center"><p className="text-xs text-teal-700 line-clamp-3">{post.content}</p></div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-3">
            <div className="text-center py-12 text-muted-foreground">
              <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">口コミはまだありません</p>
            </div>
          </div>
        )}
      </div>
    </AromaLayout>
  );
}
