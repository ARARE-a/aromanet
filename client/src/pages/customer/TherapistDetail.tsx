import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { Calendar, Heart, Image, MessageCircle, Star, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AromaAvatar, AromaLayout } from "@/components/AromaLayout";
import { StoryRing } from "@/components/StoryRing";
import { StoryViewer, type StoryAuthor } from "@/components/StoryViewer";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

export default function TherapistDetail() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const therapistId = parseInt(params.id ?? "0");
  const { session, isLoading } = useSession();
  const [activeTab, setActiveTab] = useState<"info" | "posts" | "reviews">("info");
  const [isFav, setIsFav] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [viewerAuthors, setViewerAuthors] = useState<StoryAuthor[] | null>(null);

  useEffect(() => {
    if (!isLoading && !session) navigate("/");
  }, [session, isLoading, navigate]);

  const isCustomer = session?.role === "customer";
  const { data: therapist } = trpc.therapist.getById.useQuery({ therapistId }, { enabled: !!session && !!therapistId });
  const { data: posts } = trpc.post.getFeed.useQuery({ therapistId, limit: 9 }, { enabled: !!session && !!therapistId });
  const { data: activeTherapistIds } = trpc.story.getActiveTherapistIds.useQuery(
    { therapistIds: therapistId ? [therapistId] : [] },
    { enabled: !!session && !!therapistId },
  );
  const { data: favs } = trpc.customer.getFavorites.useQuery(undefined, { enabled: !!session && isCustomer });
  const { data: followStatus } = trpc.customer.getFollowStatus.useQuery(
    { targetType: "therapist", targetId: therapistId },
    { enabled: !!session && isCustomer && !!therapistId },
  );

  useEffect(() => {
    const list = (favs as any[]) ?? [];
    setIsFav(list.some(f => f.targetType === "therapist" && f.targetId === therapistId));
  }, [favs, therapistId]);

  useEffect(() => {
    if (followStatus !== undefined) setIsFollowed((followStatus as any).following ?? false);
  }, [followStatus]);

  const utils = trpc.useUtils();
  const toggleFavMut = trpc.customer.toggleFavorite.useMutation({
    onMutate: () => setIsFav(prev => !prev),
    onError: () => { setIsFav(prev => !prev); toast.error("お気に入りの更新に失敗しました。"); },
  });
  const toggleFollowMut = trpc.customer.toggleFollow.useMutation({
    onMutate: () => setIsFollowed(prev => !prev),
    onError: () => { setIsFollowed(prev => !prev); toast.error("フォローの更新に失敗しました。"); },
    onSuccess: () => utils.customer.getFollowStatus.invalidate({ targetType: "therapist", targetId: therapistId }),
  });

  const t = therapist as any;
  const postList = (posts as any[]) ?? [];
  const hasStory = ((activeTherapistIds as number[]) ?? []).includes(therapistId);

  const handleOpenStory = async () => {
    if (!hasStory || !t) return;
    const res = await fetch(`/api/trpc/story.getByTherapistId?input=${encodeURIComponent(JSON.stringify({ json: { therapistId } }))}`);
    const json = await res.json();
    const stories = json?.result?.data?.json ?? [];
    if (stories.length > 0) {
      setViewerAuthors([{ id: therapistId, name: t.displayName, avatarUrl: t.profileImageUrl, role: "therapist", stories }]);
    }
  };

  const backHref = session?.role === "store" ? "/store/therapists" : session?.role === "therapist" ? "/therapist/dashboard" : "/home";

  return (
    <AromaLayout showBack backHref={backHref}>
      <div className="px-4 pt-4 pb-3 bg-white">
        <div className="flex items-start gap-4">
          <StoryRing hasStory={hasStory} size="lg" onClick={hasStory ? handleOpenStory : undefined}>
            <AromaAvatar name={t?.displayName} src={t?.profileImageUrl} size="xl" />
          </StoryRing>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{t?.displayName ?? "セラピスト"}</h1>
            <p className="text-xs text-muted-foreground truncate">{t?.storeName}</p>
            {t?.catchphrase && <p className="text-sm text-foreground mt-1 italic line-clamp-2">"{t.catchphrase}"</p>}
            <div className="flex items-center gap-3 mt-2">
              <Metric label="フォロワー" value={t?.followerCount ?? 0} />
              <Metric label="口コミ" value={t?.reviewCount ?? 0} />
              <div className="text-center">
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-bold text-foreground">{t?.rating?.toFixed?.(1) ?? "4.5"}</span>
                </div>
                <div className="text-xs text-muted-foreground">評価</div>
              </div>
            </div>
          </div>
        </div>

        {isCustomer && (
          <div className="flex gap-2 mt-3">
            <Button
              className={`flex-1 h-9 rounded-xl text-sm font-semibold transition-all ${isFollowed ? "bg-muted text-foreground border border-border" : "gradient-luxury text-white"}`}
              onClick={() => toggleFollowMut.mutate({ targetType: "therapist", targetId: therapistId })}
            >
              <UserPlus className="w-4 h-4 mr-1" />{isFollowed ? "フォロー中" : "フォロー"}
            </Button>
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => toggleFavMut.mutate({ targetType: "therapist", targetId: therapistId })}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center active:bg-muted transition-colors"
              aria-label="お気に入り"
            >
              <Heart className={`w-4 h-4 transition-colors ${isFav ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
            </motion.button>
            <Link href={`/messages?therapistId=${therapistId}`}>
              <button className="w-9 h-9 rounded-xl border border-border flex items-center justify-center active:bg-muted transition-colors" aria-label="メッセージ">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
              </button>
            </Link>
          </div>
        )}
      </div>

      <div className="flex border-b border-border/50 bg-white">
        {(["info", "posts", "reviews"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            {tab === "info" ? "プロフィール" : tab === "posts" ? "投稿" : "口コミ"}
          </button>
        ))}
      </div>

      <div className="px-4 py-3 pb-24">
        {activeTab === "info" && (
          <div className="space-y-3">
            {t?.selfIntroduction && (
              <div className="bg-white rounded-2xl p-4 shadow-luxury">
                <h3 className="text-sm font-semibold text-foreground mb-2">自己紹介</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.selfIntroduction}</p>
              </div>
            )}
            <div className="bg-white rounded-2xl p-4 shadow-luxury">
              <h3 className="text-sm font-semibold text-foreground mb-2">プロフィール</h3>
              <div className="space-y-2 text-sm">
                {t?.age && <InfoRow label="年齢" value={`${t.age}歳`} />}
                {t?.height && <InfoRow label="身長" value={`${t.height}cm`} />}
                {t?.bodyType && <InfoRow label="スタイル" value={t.bodyType} />}
                {t?.specialties && <InfoRow label="得意施術" value={t.specialties} />}
              </div>
            </div>
          </div>
        )}

        {activeTab === "posts" && (
          <div className="grid grid-cols-3 gap-1">
            {postList.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-muted-foreground">
                <Image className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">投稿はまだありません</p>
              </div>
            ) : postList.map((post: any) => (
              <motion.div
                key={post.id}
                whileTap={{ scale: 0.95 }}
                className="aspect-square bg-gradient-to-br from-teal-100 to-teal-200 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer"
              >
                {post.imageUrl ? <img src={post.imageUrl} alt="" className="w-full h-full object-cover" /> : (
                  <div className="p-2 text-center"><p className="text-xs text-teal-700 line-clamp-3">{post.content}</p></div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="text-center py-12 text-muted-foreground">
            <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">口コミはまだありません</p>
          </div>
        )}
      </div>

      {isCustomer && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 px-4 py-3" style={{ maxWidth: "430px", margin: "0 auto" }}>
          <Link href={`/my/reservations?therapistId=${therapistId}`}>
            <Button className="w-full h-12 rounded-xl gradient-luxury text-white text-base font-semibold">
              <Calendar className="w-5 h-5 mr-2" />このセラピストを指名して予約
            </Button>
          </Link>
        </div>
      )}

      {viewerAuthors && <StoryViewer authors={viewerAuthors} onClose={() => setViewerAuthors(null)} />}
    </AromaLayout>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
