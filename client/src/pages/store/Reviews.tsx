import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Star, MessageSquare, EyeOff } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function StoreReviews() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  useEffect(() => { if (!isLoading && (!session || session.role !== "store")) navigate("/store/login"); }, [session, isLoading]);
  const { data: reviews, refetch } = trpc.review.getMyStoreReviews.useQuery(undefined, { enabled: !!session });
  const hideMut = trpc.review.hide.useMutation({ onSuccess: () => { toast.success("口コミの表示を変更しました"); refetch(); }, onError: (e: any) => toast.error(e.message) });
  const list = (reviews as any[]) ?? [];
  return (
    <AromaLayout title="口コミ管理" showBack backHref="/store/dashboard">
      <div className="px-4 py-3 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">口コミはまだありません</p></div>
        ) : list.map((r: any, i: number) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`bg-white rounded-2xl p-4 shadow-luxury ${r.isHidden ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <AromaAvatar name={r.customerName ?? "匿名"} size="sm" />
                <div>
                  <div className="text-sm font-medium text-foreground">{r.customerName ?? "匿名"}</div>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`w-3 h-3 ${j < r.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                    ))}
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label={r.isHidden ? "口コミを再表示" : "口コミを非表示"}
                onClick={() => hideMut.mutate({ reviewId: r.id, hide: !r.isHidden })}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
            {r.isHidden && <span className="text-xs text-red-500 mt-1 block">非表示中</span>}
          </motion.div>
        ))}
      </div>
    </AromaLayout>
  );
}
