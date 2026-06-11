import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Building2, Clock, CheckCircle, XCircle, Send, Search } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const statusLabel: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "審査中", color: "text-yellow-600 bg-yellow-50", icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { label: "承認済み", color: "text-green-600 bg-green-50", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected: { label: "却下", color: "text-red-600 bg-red-50", icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function TherapistAffiliations() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login");
  }, [session, isLoading]);

  const { data: requests, refetch } = trpc.affiliation.getMyRequests.useQuery(undefined, { enabled: !!session });
  const { data: stores } = trpc.store.search.useQuery({ keyword, limit: 20 }, { enabled: !!session });

  const apply = trpc.affiliation.sendRequest.useMutation({
    onSuccess: () => {
      toast.success("所属申請を送信しました");
      setSelectedStoreId(null);
      setMessage("");
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reqList = (requests as any[]) ?? [];
  const storeList = (stores as any[]) ?? [];

  return (
    <AromaLayout title="所属申請" showBack backHref="/therapist/dashboard">
      <div className="px-4 pt-4 pb-24 space-y-5">
        {/* Current requests */}
        {reqList.length > 0 && (
          <section>
            <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3">申請状況</h2>
            <div className="space-y-2">
              {reqList.map((r: any, i: number) => {
                const s = statusLabel[r.status] ?? statusLabel.pending;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold truncate">{r.storeName ?? "店舗"}</div>
                      <div className="text-[12px] text-gray-400">{new Date(r.createdAt).toLocaleDateString("ja-JP")}</div>
                    </div>
                    <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${s.color}`}>
                      {s.icon}{s.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Apply to store */}
        <section>
          <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3">店舗を探して申請</h2>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="店舗名・エリアで検索"
              className="pl-9 rounded-xl h-10 text-[14px]"
            />
          </div>

          {selectedStoreId && (
            <div className="mb-3 p-3 bg-teal-50 rounded-xl">
              <div className="text-[13px] font-medium text-primary mb-2">
                {storeList.find((s: any) => s.id === selectedStoreId)?.name} に申請
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="自己紹介メッセージ（任意）"
                className="w-full text-[13px] bg-white rounded-lg p-2.5 border border-gray-200 resize-none h-20 focus:outline-none focus:border-primary"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={() => apply.mutate({ storeId: selectedStoreId, message })}
                  disabled={apply.isPending}
                  className="flex-1 rounded-xl h-9 text-[13px]"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  申請を送る
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedStoreId(null)}
                  className="rounded-xl h-9 text-[13px]"
                >
                  キャンセル
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {storeList.map((s: any) => {
              const alreadyApplied = reqList.some((r: any) => r.storeId === s.id);
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                    {s.logoUrl
                      ? <img src={s.logoUrl} alt={s.name} className="w-full h-full object-cover rounded-xl" />
                      : <Building2 className="w-5 h-5 text-primary" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold truncate">{s.name}</div>
                    <div className="text-[12px] text-gray-400">{s.area}</div>
                  </div>
                  {alreadyApplied ? (
                    <span className="text-[11px] text-gray-400 font-medium">申請済み</span>
                  ) : (
                    <button
                      onClick={() => setSelectedStoreId(s.id)}
                      className="text-[12px] font-semibold text-primary border border-primary rounded-lg px-3 py-1 active:bg-teal-50"
                    >
                      申請
                    </button>
                  )}
                </div>
              );
            })}
            {storeList.length === 0 && keyword && (
              <div className="text-center py-8 text-gray-400 text-[13px]">
                「{keyword}」に一致する店舗が見つかりません
              </div>
            )}
          </div>
        </section>
      </div>
    </AromaLayout>
  );
}
