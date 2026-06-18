import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Building2, CheckCircle, Clock, XCircle } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";

const statusLabel: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "審査中", color: "text-yellow-600 bg-yellow-50", icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { label: "承認済み", color: "text-green-600 bg-green-50", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected: { label: "却下", color: "text-red-600 bg-red-50", icon: <XCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: "取消済み", color: "text-gray-500 bg-gray-50", icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function TherapistAffiliations() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login");
  }, [session, isLoading]);

  const { data: profile } = trpc.therapist.getMyProfile.useQuery(undefined, { enabled: !!session });
  const { data: requests } = trpc.affiliation.getMyRequests.useQuery(undefined, { enabled: !!session });
  const p = profile as any;
  const reqList = (requests as any[]) ?? [];

  return (
    <AromaLayout title="所属店舗" showBack backHref="/therapist/dashboard">
      <div className="px-4 pt-4 pb-24 space-y-5">
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-gray-500">現在の所属</div>
              <div className="text-[15px] font-semibold truncate">{p?.storeName ?? "未所属"}</div>
            </div>
            {p?.storeId && (
              <span className="text-[11px] font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">所属中</span>
            )}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-gray-500">
            新規所属は、店舗が発行した招待URLから登録する方式です。店舗検索からの所属申請は使いません。
          </p>
        </section>

        <section>
          <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3">所属履歴</h2>
          {reqList.length > 0 ? (
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
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold truncate">{r.storeName ?? r.store?.name ?? "店舗"}</div>
                      <div className="text-[12px] text-gray-400">{new Date(r.createdAt).toLocaleDateString("ja-JP")}</div>
                    </div>
                    <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${s.color}`}>
                      {s.icon}{s.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center text-[13px] text-gray-500">
              所属履歴はまだありません
            </div>
          )}
        </section>
      </div>
    </AromaLayout>
  );
}
