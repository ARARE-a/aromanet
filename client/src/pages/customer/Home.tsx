import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Bell, Heart, MapPin, Star, MessageCircle, User, Home, Bookmark,
  Compass, Grid3x3, Plus, MoreHorizontal, Send, X
} from "lucide-react";
import { AromaLayout, AromaLogo, AromaAvatar, StoryAvatar, LevelBadge } from "@/components/AromaLayout";
import { StoryRing } from "@/components/StoryRing";
import { StoryViewer, type StoryAuthor } from "@/components/StoryViewer";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { toast } from "sonner";

const navItems = [
  {
    href: "/home",
    icon: <Home className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Home className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "ホーム"
  },
  {
    href: "/search",
    icon: <Search className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Search className="w-[26px] h-[26px]" strokeWidth={2.5} />,
    label: "検索"
  },
  {
    href: "/my/reservations",
    icon: <Bookmark className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Bookmark className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "予約"
  },
  {
    href: "/messages",
    icon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "DM"
  },
  {
    href: "/my/page",
    icon: <User className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <User className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "マイページ"
  },
];

export default function CustomerHome() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading]);

  const { data: profile } = trpc.customer.getMyProfile.useQuery(undefined, { enabled: !!session });
  const { data: stores } = trpc.store.search.useQuery({ limit: 8 }, { enabled: !!session });
  const { data: therapists } = trpc.therapist.search.useQuery({ limit: 10 }, { enabled: !!session });
  const { data: posts } = trpc.post.getFeed.useQuery({ limit: 12 }, { enabled: !!session });
  const [viewerAuthors, setViewerAuthors] = useState<StoryAuthor[] | null>(null);
  const therapistIds = useMemo(() => (therapists as any[] ?? []).map((t: any) => t.id), [therapists]);
  const { data: activeTherapistIds } = trpc.story.getActiveTherapistIds.useQuery(
    { therapistIds },
    { enabled: therapistIds.length > 0 }
  );
  const activeSet = useMemo(() => new Set(activeTherapistIds ?? []), [activeTherapistIds]);

  const p = profile as any;
  const storeList = (stores as any[]) ?? [];
  const therapistList = (therapists as any[]) ?? [];

  const handleOpenStory = async (t: any) => {
    if (!activeSet.has(t.id)) return;
    // Fetch stories for this therapist
    const res = await fetch(`/api/trpc/story.getByTherapistId?input=${encodeURIComponent(JSON.stringify({ json: { therapistId: t.id } }))}`);
    const json = await res.json();
    const stories = json?.result?.data?.json ?? [];
    if (stories.length > 0) {
      setViewerAuthors([{ id: t.id, name: t.displayName, avatarUrl: t.profileImageUrl, role: "therapist", stories }]);
    }
  };
  const postList = (posts as any[]) ?? [];

  if (isLoading || !session) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AromaLayout
      showNav
      navItems={navItems}
      titleLogo
      headerRight={
        <div className="flex items-center gap-3">
          <Link href="/my/notifications">
            <button className="relative p-1">
              <Bell className="w-[26px] h-[26px]" strokeWidth={1.5} />
            </button>
          </Link>
          <Link href="/messages">
            <button className="p-1">
              <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />
            </button>
          </Link>
        </div>
      }
    >
      {/* Stories row (therapist avatars) */}
      <div className="border-b border-gray-100">
        <div className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-none">
          {/* "あなた" story slot */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="relative">
              <AromaAvatar name={p?.displayName} src={p?.profileImageUrl} size="lg" />
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-white">
                <Plus className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            </div>
            <span className="text-[11px] text-gray-500 truncate w-16 text-center">あなた</span>
          </div>

          {/* Therapist stories */}
          {therapistList.map((t: any) => {
            const hasStory = activeSet.has(t.id);
            return (
              <div key={t.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                <StoryRing hasStory={hasStory} size="md"
                  onClick={() => hasStory ? handleOpenStory(t) : navigate(`/therapist/${t.id}`)}
                  className="cursor-pointer">
                  <AromaAvatar name={t.displayName} src={t.profileImageUrl} size="md" />
                </StoryRing>
                <span className="text-[11px] text-gray-700 truncate w-16 text-center">{t.displayName?.split(" ")[0] ?? t.displayName}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feed posts */}
      <div>
        {postList.length > 0 ? (
          postList.map((post: any, i: number) => (
            <PostCard
              key={post.id}
              post={post}
              index={i}
              hasStory={activeSet.has(post.therapistId)}
              onOpenStory={() => {
                const author = therapistList.find((t: any) => t.id === post.therapistId) ?? {
                  id: post.therapistId,
                  displayName: post.therapistName,
                  profileImageUrl: post.therapistImage,
                };
                handleOpenStory(author);
              }}
            />
          ))
        ) : (
          /* Fallback: show store cards in feed style */
          storeList.map((store: any, i: number) => (
            <StoreFeedCard key={store.id} store={store} index={i} />
          ))
        )}

        {/* Therapist grid section */}
        {therapistList.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
              <span className="text-[13px] font-semibold text-foreground">人気セラピスト</span>
              <Link href="/search?tab=therapist">
                <span className="text-[13px] text-primary font-medium">すべて見る</span>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-px bg-gray-100">
              {therapistList.slice(0, 9).map((t: any) => (
                <Link key={t.id} href={`/therapist/${t.id}`}>
                  <div className="aspect-square bg-gradient-to-br from-teal-50 to-teal-100 relative overflow-hidden cursor-pointer">
                    {t.profileImageUrl
                      ? <img src={t.profileImageUrl} alt={t.displayName} className="w-full h-full object-cover" />
                      : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                          <AromaAvatar name={t.displayName} size="lg" />
                          <span className="text-[10px] text-gray-600 font-medium px-1 text-center leading-tight">{t.displayName}</span>
                        </div>
                      )
                    }
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                      <div className="text-[10px] text-white font-medium truncate">{t.displayName}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Story Viewer */}
      {viewerAuthors && (
        <StoryViewer
          authors={viewerAuthors}
          onClose={() => setViewerAuthors(null)}
        />
      )}
    </AromaLayout>
  );
}

function PostCard({ post, index, hasStory, onOpenStory }: { post: any; index: number; hasStory: boolean; onOpenStory: () => void }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(Boolean(post.savedByMe));
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    setSaved(Boolean(post.savedByMe));
  }, [post.savedByMe]);

  const { data: comments } = trpc.post.getComments.useQuery(
    { postId: post.id },
    { enabled: commentsOpen }
  );

  const toggleSaveMut = trpc.customer.toggleFavorite.useMutation({
    onMutate: () => setSaved(prev => !prev),
    onSuccess: () => {
      utils.customer.getFavorites.invalidate();
      utils.post.getFeed.invalidate();
    },
    onError: () => {
      setSaved(prev => !prev);
      toast.error("保存に失敗しました");
    },
  });

  const addCommentMut = trpc.post.addComment.useMutation({
    onSuccess: () => {
      setCommentText("");
      utils.post.getComments.invalidate({ postId: post.id });
      utils.post.getFeed.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const handleToggleSave = () => {
    toggleSaveMut.mutate({ targetType: "post", targetId: post.id });
    setMenuOpen(false);
  };

  const handleStoryOrProfile = () => {
    if (hasStory) {
      onOpenStory();
    } else {
      navigate(`/therapist/${post.therapistId}`);
    }
  };

  const handleCommentSubmit = () => {
    const comment = commentText.trim();
    if (!comment) return;
    addCommentMut.mutate({ postId: post.id, comment });
  };

  const commentList = (comments as any[]) ?? [];
  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-gray-100"
    >
      {/* Post header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <button onClick={handleStoryOrProfile} className="active:scale-95 transition-transform">
          <StoryAvatar name={post.therapistName} src={post.therapistImage} size="sm" hasStory={hasStory} />
        </button>
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-foreground">{post.therapistName}</div>
          {post.storeName && <div className="text-[11px] text-gray-500">{post.storeName}</div>}
        </div>
        <div className="relative">
          <button className="p-1 text-gray-500 active:scale-95" onClick={() => setMenuOpen(prev => !prev)} aria-label="投稿メニュー">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-gray-100 bg-white py-1 shadow-luxury">
              <button onClick={handleToggleSave} className="w-full px-3 py-2 text-left text-xs text-foreground active:bg-gray-50">
                {saved ? "保存を解除" : "投稿を保存"}
              </button>
              <button onClick={() => navigate(`/therapist/${post.therapistId}`)} className="w-full px-3 py-2 text-left text-xs text-foreground active:bg-gray-50">
                プロフィールを見る
              </button>
              <button onClick={() => { setMenuOpen(false); toast.success("通報を受け付けました"); }} className="w-full px-3 py-2 text-left text-xs text-red-500 active:bg-red-50">
                通報
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post image */}
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 w-full overflow-hidden">
        {post.imageUrl
          ? isVideoUrl(post.imageUrl)
            ? <video src={post.imageUrl} className="w-full h-full object-cover" controls playsInline />
            : <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center px-6">
                <div className="text-4xl mb-3">✨</div>
                <p className="text-sm text-gray-600 leading-relaxed">{post.content}</p>
              </div>
            </div>
          )
        }
      </div>

      {/* Actions */}
      <div className="px-4 pt-2.5 pb-1">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => setLiked(!liked)} className="active:scale-90 transition-transform">
            <Heart
              className={`w-[26px] h-[26px] transition-colors duration-150 ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`}
              strokeWidth={liked ? 0 : 1.5}
            />
          </button>
          <button onClick={() => setCommentsOpen(true)} className="active:scale-90 transition-transform">
            <MessageCircle className="w-[26px] h-[26px] text-foreground" strokeWidth={1.5} />
          </button>
          <div className="ml-auto">
            <button onClick={handleToggleSave} className="active:scale-90 transition-transform" aria-label="投稿を保存">
              <Bookmark className={`w-[26px] h-[26px] ${saved ? "fill-foreground text-foreground" : "text-foreground"}`} strokeWidth={1.5} />
            </button>
          </div>
        </div>
        {post.commentCount > 0 && (
          <button onClick={() => setCommentsOpen(true)} className="text-[12px] text-gray-500 mb-1">
            コメント{post.commentCount}件を表示
          </button>
        )}
        {post.content && (
          <p className="text-[13px] text-foreground leading-relaxed">
            <span className="font-semibold mr-1">{post.therapistName}</span>
            {post.content}
          </p>
        )}
      </div>

      <AnimatePresence>
        {commentsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 flex items-end"
            onClick={() => setCommentsOpen(false)}
          >
            <motion.div
              initial={{ y: 320 }}
              animate={{ y: 0 }}
              exit={{ y: 320 }}
              className="w-full max-h-[78dvh] rounded-t-3xl bg-white overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="font-semibold text-sm">コメント</div>
                <button onClick={() => setCommentsOpen(false)} className="p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[52dvh] overflow-y-auto px-4 py-3 space-y-3">
                {commentList.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">まだコメントはありません</div>
                ) : commentList.map((comment: any) => (
                  <div key={comment.id} className="flex gap-2">
                    <AromaAvatar name={comment.customerName} src={comment.customerImage} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-foreground">{comment.customerName}</div>
                      <div className="text-sm text-foreground whitespace-pre-wrap break-words">{comment.comment}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-2 border-t border-gray-100 p-3">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  rows={1}
                  placeholder="コメントを追加..."
                  className="min-h-10 max-h-24 flex-1 resize-none rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={handleCommentSubmit}
                  disabled={addCommentMut.isPending || !commentText.trim()}
                  className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40"
                  aria-label="コメントを送信"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function StoreFeedCard({ store: s, index }: { store: any; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.04 }}
      className="border-b border-gray-100"
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <Link href={`/store/${s.id}`}>
          <div className="w-8 h-8 rounded-full overflow-hidden bg-teal-muted flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
            {s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="w-full h-full object-cover" /> : s.name?.[0]}
          </div>
        </Link>
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-foreground">{s.name}</div>
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <MapPin className="w-3 h-3" />{s.area}
          </div>
        </div>
      </div>
      <Link href={`/store/${s.id}`}>
        <div className="aspect-[4/3] bg-gradient-to-br from-teal-50 to-teal-100 overflow-hidden cursor-pointer">
          {s.coverImageUrl
            ? <img src={s.coverImageUrl} alt={s.name} className="w-full h-full object-cover" />
            : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <div className="text-5xl font-bold text-teal-200" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{s.name?.[0]}</div>
                <div className="text-sm text-teal-600 font-medium">{s.name}</div>
              </div>
            )
          }
        </div>
      </Link>
      <div className="px-4 pt-2.5 pb-3">
        <div className="flex items-center gap-1 mb-1">
          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
          <span className="text-[13px] font-semibold">{s.rating?.toFixed(1) ?? "4.5"}</span>
          <span className="text-[12px] text-gray-500">({s.reviewCount ?? 0}件)</span>
        </div>
        {s.catchphrase && <p className="text-[13px] text-gray-600 leading-relaxed">{s.catchphrase}</p>}
      </div>
    </motion.article>
  );
}
