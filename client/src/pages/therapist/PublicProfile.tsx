import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Star, Heart, MessageCircle, Calendar, Image, Eye, ExternalLink } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";

export default function TherapistPublicProfile() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [activeTab, setActiveTab] = useState<"info" | "posts">("info");

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login");
  }, [session, isLoading]);

  const { data: profile } = trpc.therapist.getMyProfile.useQuery(undefined, { enabled: !!session });
  const { data: posts } = trpc.post.getMyPosts.useQuery(undefined, { enabled: !!session });

  const p = profile as any;
  const postList = (posts as any[]) ?? [];

  return (
    <AromaLayout showBack backHref="/therapist/profile" title="公開プロフィール確認">
      {/* Preview banner */}
      <div className="mx-4 mt-3 mb-1 py-2.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2 px-3">
        <Eye className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="text-xs text-primary font-medium">これはお客様に見えるプロフィールのプレビューです</p>
      </div>

      {/* Profile header */}
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-start gap-4">
          <AromaAvatar name={p?.displayName} src={p?.profileImageUrl} size="xl" />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{p?.displayName ?? "セラピスト名"}</h1>
            <p className="text-xs text-muted-foreground">{p?.storeName ?? "所属店舗"}</p>
            {p?.catchphrase && <p className="text-sm text-foreground mt-1 italic">"{p.catchphrase}"</p>}
            <div className="flex items-center gap-3 mt-2">
              <div className="text-center">
                <div className="text-sm font-bold text-foreground">{p?.followerCount ?? 0}</div>
                <div className="text-xs text-muted-foreground">フォロワー</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-foreground">{p?.reviewCount ?? 0}</div>
                <div className="text-xs text-muted-foreground">口コミ</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-bold text-foreground">{p?.reviewAvg ? parseFloat(p.reviewAvg).toFixed(1) : "—"}</span>
                </div>
                <div className="text-xs text-muted-foreground">評価</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons (preview - non-functional) */}
        <div className="flex gap-2 mt-3 opacity-60 pointer-events-none select-none">
          <Button className="flex-1 h-9 rounded-xl gradient-luxury text-white text-sm">
            フォロー
          </Button>
          <button className="w-9 h-9 rounded-xl border border-border flex items-center justify-center">
            <Heart className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="w-9 h-9 rounded-xl border border-border flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-1">※ ボタンはプレビューのため無効です</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50">
        {(["info", "posts"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
            {tab === "info" ? "プロフィール" : "投稿"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-3">
        {activeTab === "info" && (
          <div className="space-y-3">
            {p?.selfIntroduction && (
              <div className="bg-white rounded-2xl p-4 shadow-luxury">
                <h3 className="text-sm font-semibold text-foreground mb-2">自己紹介</h3>
                <p className="text-sm text-muted-foreground">{p.selfIntroduction}</p>
              </div>
            )}
            {!p?.selfIntroduction && (
              <div className="bg-white rounded-2xl p-4 shadow-luxury border border-dashed border-gray-200">
                <p className="text-sm text-muted-foreground text-center">自己紹介が未設定です</p>
                <Link href="/therapist/profile">
                  <p className="text-xs text-primary text-center mt-1 flex items-center justify-center gap-1">
                    <ExternalLink className="w-3 h-3" />プロフィール編集で追加する
                  </p>
                </Link>
              </div>
            )}
            <div className="bg-white rounded-2xl p-4 shadow-luxury">
              <h3 className="text-sm font-semibold text-foreground mb-2">プロフィール</h3>
              <div className="space-y-2 text-sm">
                {p?.age && <div className="flex justify-between"><span className="text-muted-foreground">年齢</span><span>{p.age}歳</span></div>}
                {p?.height && <div className="flex justify-between"><span className="text-muted-foreground">身長</span><span>{p.height}cm</span></div>}
                {p?.bodyType && <div className="flex justify-between"><span className="text-muted-foreground">スタイル</span><span>{p.bodyType}</span></div>}
                {p?.specialties && <div className="flex justify-between"><span className="text-muted-foreground">得意技</span><span className="text-right max-w-[60%]">{p.specialties}</span></div>}
              </div>
            </div>

            {/* SNS links */}
            {(p?.instagramUrl || p?.twitterUrl) && (
              <div className="bg-white rounded-2xl p-4 shadow-luxury">
                <h3 className="text-sm font-semibold text-foreground mb-3">SNS</h3>
                <div className="flex gap-2">
                  {p?.instagramUrl && (
                    <a href={p.instagramUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-aroma-social text-white text-xs font-medium">
                      <ExternalLink className="w-3.5 h-3.5" />
                      フォトSNS
                    </a>
                  )}
                  {p?.twitterUrl && (
                    <a href={p.twitterUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black text-white text-xs font-medium">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
                      X (Twitter)
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Public status */}
            <div className={`rounded-2xl p-4 flex items-center gap-3 ${p?.isPublic ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p?.isPublic ? "bg-emerald-500" : "bg-amber-500"}`} />
              <div>
                <p className={`text-sm font-semibold ${p?.isPublic ? "text-emerald-700" : "text-amber-700"}`}>
                  {p?.isPublic ? "公開中" : "非公開"}
                </p>
                <p className={`text-xs ${p?.isPublic ? "text-emerald-600" : "text-amber-600"}`}>
                  {p?.isPublic ? "お客様の検索結果に表示されています" : "現在お客様には表示されていません"}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "posts" && (
          <div className="grid grid-cols-3 gap-1">
            {postList.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-muted-foreground">
                <Image className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">投稿がありません</p>
                <Link href="/therapist/posts">
                  <p className="text-xs text-primary mt-2">投稿を作成する</p>
                </Link>
              </div>
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
      </div>

      {/* Edit profile CTA */}
      <div className="px-4 pb-6 mt-2">
        <Link href="/therapist/profile">
          <Button variant="outline" className="w-full h-10 rounded-xl text-sm border-primary text-primary">
            プロフィールを編集する
          </Button>
        </Link>
      </div>
    </AromaLayout>
  );
}
