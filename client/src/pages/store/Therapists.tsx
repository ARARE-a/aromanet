import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Link2, Search, UserX, Star, MessageCircle } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StoreTherapists() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "store")) navigate("/store/login");
  }, [session, isLoading, navigate]);

  const { data: therapists } = trpc.store.getTherapists.useQuery(undefined, { enabled: !!session });

  const list = ((therapists as any[]) ?? []).filter((t: any) =>
    !search || t.displayName?.includes(search)
  );

  return (
    <AromaLayout title="スタッフ管理" showBack backHref="/store/dashboard">
      <div className="px-4 py-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="名前で検索" className="pl-9 h-9 rounded-xl" />
        </div>
        <Button size="sm" className="h-9 rounded-xl gradient-luxury text-white" onClick={() => navigate("/store/affiliations")}>
          <Link2 className="w-4 h-4 mr-1" />招待
        </Button>
      </div>
      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => navigate("/store/affiliations")}
          className="w-full rounded-2xl bg-white p-3 text-left shadow-luxury active:scale-[0.99] transition"
        >
          <div className="text-sm font-semibold text-foreground">セラピスト招待URLを発行</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            URLから登録したセラピストだけが、この店舗の所属として自動登録されます。
          </div>
        </button>
      </div>
      <div className="px-4 space-y-3">
        {list.map((t: any, i: number) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-luxury flex items-center gap-3">
            <AromaAvatar src={t.profileImageUrl} name={t.displayName} size="md" />
            <div className="flex-1">
              <div className="font-semibold text-foreground text-sm">{t.displayName}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500" />{t.rating?.toFixed(1) ?? "4.5"} · {t.reviewCount ?? 0}件
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg"
                onClick={() => navigate(`/messages?therapistId=${t.id}&storeId=${session?.storeId}&type=store_therapist`)}>
                <MessageCircle className="w-3 h-3 mr-1" />DM
              </Button>
              <Link href={`/therapist/${t.id}`}>
                <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg">プロフィール</Button>
              </Link>
            </div>
          </motion.div>
        ))}
        {list.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <UserX className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">スタッフが登録されていません</p>
            <p className="text-xs mt-1">招待URLを発行して、セラピスト本人に登録してもらってください</p>
          </div>
        )}
      </div>
    </AromaLayout>
  );
}
