import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ExternalLink, Eye, Heart, Image, MessageCircle, PlayCircle, Star } from "lucide-react";
import { AromaAvatar, AromaLayout } from "@/components/AromaLayout";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v"];

function isVideoUrl(url?: string | null) {
  if (!url) return false;
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return VIDEO_EXTENSIONS.some(ext => path.endsWith(ext));
}

export default function TherapistPublicProfile() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [activeTab, setActiveTab] = useState<"info" | "posts">("info");

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login");
  }, [session, isLoading, navigate]);

  const { data: profile } = trpc.therapist.getMyProfile.useQuery(undefined, { enabled: !!session });
  const { data: posts } = trpc.post.getMyPosts.useQuery(undefined, { enabled: !!session });

  const p = profile as any;
  const postList = (posts as any[]) ?? [];
  const reviewAvg = p?.reviewAvg ? Number(p.reviewAvg).toFixed(1) : "-";

  return (
    <AromaLayout showBack backHref="/therapist/profile" title="公開プロフィール確認">
      <div className="mx-4 mt-3 mb-1 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 flex-shrink-0 text-primary" />
          <p className="text-xs font-medium text-primary">顧客に表示されるプロフィールのプレビューです</p>
        </div>
      </div>

      <div className="px-4 pb-3 pt-3">
        <div className="flex items-start gap-4">
          <AromaAvatar name={p?.displayName} src={p?.profileImageUrl} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-foreground">{p?.displayName ?? "セラピスト名"}</h1>
            <p className="text-xs text-muted-foreground">{p?.storeName ?? "所属店舗未設定"}</p>
            {p?.catchphrase && <p className="mt-1 text-sm italic text-foreground">"{p.catchphrase}"</p>}
            <div className="mt-2 flex items-center gap-3">
              <ProfileMetric value={p?.followerCount ?? 0} label="フォロワー" />
              <ProfileMetric value={p?.reviewCount ?? 0} label="口コミ" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-0.5">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  <span className="text-sm font-bold text-foreground">{reviewAvg}</span>
                </div>
                <div className="text-xs text-muted-foreground">評価</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_44px_44px] gap-2">
          <Button className="h-10 rounded-xl gradient-luxury text-sm text-white" disabled>
            フォロー表示
          </Button>
          <button className="flex h-10 items-center justify-center rounded-xl border border-border bg-white" disabled aria-label="お気に入り表示">
            <Heart className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="flex h-10 items-center justify-center rounded-xl border border-border bg-white" disabled aria-label="メッセージ表示">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">プレビューのため、顧客向けアクションは押せません</p>
      </div>

      <div className="flex border-b border-border/50">
        {(["info", "posts"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
            }`}
          >
            {tab === "info" ? "プロフィール" : "投稿"}
          </button>
        ))}
      </div>

      <div className="px-4 py-3">
        {activeTab === "info" ? (
          <div className="space-y-3">
            <InfoBlock title="自己紹介">
              {p?.selfIntroduction ? (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{p.selfIntroduction}</p>
              ) : (
                <EmptyEditLink text="自己紹介が未設定です" />
              )}
            </InfoBlock>

            <InfoBlock title="プロフィール">
              <div className="space-y-2 text-sm">
                <ProfileRow label="年齢" value={p?.age ? `${p.age}歳` : undefined} />
                <ProfileRow label="身長" value={p?.height ? `${p.height}cm` : undefined} />
                <ProfileRow label="スタイル" value={p?.bodyType} />
                <ProfileRow label="得意施術" value={p?.specialties} />
                {!p?.age && !p?.height && !p?.bodyType && !p?.specialties && <EmptyEditLink text="詳細プロフィールが未設定です" />}
              </div>
            </InfoBlock>

            {(p?.instagramUrl || p?.twitterUrl) && (
              <InfoBlock title="SNS">
                <div className="flex flex-wrap gap-2">
                  {p?.instagramUrl && <ExternalButton href={p.instagramUrl} label="Instagram" />}
                  {p?.twitterUrl && <ExternalButton href={p.twitterUrl} label="X" />}
                </div>
              </InfoBlock>
            )}

            <div className={`flex items-center gap-3 rounded-xl border p-4 ${p?.isPublic ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <div className={`h-2 w-2 flex-shrink-0 rounded-full ${p?.isPublic ? "bg-emerald-500" : "bg-amber-500"}`} />
              <div>
                <p className={`text-sm font-semibold ${p?.isPublic ? "text-emerald-700" : "text-amber-700"}`}>
                  {p?.isPublic ? "公開中" : "非公開"}
                </p>
                <p className={`text-xs ${p?.isPublic ? "text-emerald-600" : "text-amber-600"}`}>
                  {p?.isPublic ? "顧客の検索結果と店舗ページに表示されます" : "現在、顧客には表示されません"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <PostGrid posts={postList} />
        )}
      </div>

      <div className="px-4 pb-6 pt-2">
        <Link href="/therapist/profile">
          <Button variant="outline" className="h-10 w-full rounded-xl border-primary text-sm text-primary">
            プロフィールを編集する
          </Button>
        </Link>
      </div>
    </AromaLayout>
  );
}

function ProfileMetric({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-luxury">
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function ProfileRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[65%] text-right text-foreground">{value}</span>
    </div>
  );
}

function EmptyEditLink({ text }: { text: string }) {
  return (
    <Link href="/therapist/profile">
      <p className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-gray-200 py-3 text-center text-xs text-primary">
        <ExternalLink className="h-3 w-3" />
        {text}
      </p>
    </Link>
  );
}

function ExternalButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-white">
      <ExternalLink className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

function PostGrid({ posts }: { posts: any[] }) {
  if (!posts.length) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Image className="mx-auto mb-2 h-10 w-10 opacity-30" />
        <p className="text-sm">投稿はまだありません</p>
        <Link href="/therapist/posts">
          <p className="mt-2 text-xs text-primary">投稿を作成する</p>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {posts.map((post: any) => (
        <motion.div key={post.id} whileTap={{ scale: 0.95 }} className="relative aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-teal-100 to-teal-200">
          {post.imageUrl ? (
            isVideoUrl(post.imageUrl) ? (
              <>
                <video src={post.imageUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                  <PlayCircle className="h-8 w-8 text-white drop-shadow" />
                </div>
              </>
            ) : (
              <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full items-center justify-center p-2 text-center">
              <p className="line-clamp-3 text-xs text-teal-700">{post.content}</p>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
