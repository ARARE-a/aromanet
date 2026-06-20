import { useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Clock, Shield } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CustomerVerification() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading, navigate]);

  const { data: profile } = trpc.customer.getMyProfile.useQuery(undefined, { enabled: !!session });
  const { data: verificationStatus } = trpc.admin.getVerificationStatus.useQuery(undefined, { enabled: !!session });
  const submitAgeVerification = trpc.admin.submitAgeVerification.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.customer.getMyProfile.invalidate(),
        utils.admin.getVerificationStatus.invalidate(),
      ]);
      toast.success("年齢確認の申請を受け付けました。審査完了までお待ちください。");
    },
    onError: (error) => {
      toast.error(error.message || "申請に失敗しました。");
    },
  });

  const p = profile as any;
  const status = p?.verificationStatus ?? (verificationStatus as any)?.status ?? "not_submitted";
  const isVerified = Boolean(p?.isVerified);
  const isPending = status === "pending";
  const isRejected = status === "rejected";

  const handleSubmit = () => {
    submitAgeVerification.mutate({ method: "manual_review_required" });
  };

  return (
    <AromaLayout title="年齢確認" showBack>
      <div className="px-4 py-6 space-y-6 pb-24">
        {isVerified ? (
          <StatusPanel
            tone="green"
            icon={<CheckCircle className="w-12 h-12 text-green-500" />}
            title="年齢確認済み"
            text="管理者による確認が完了しています。"
          />
        ) : isPending ? (
          <StatusPanel
            tone="blue"
            icon={<Clock className="w-12 h-12 text-blue-500" />}
            title="審査中"
            text="年齢確認の申請を受け付けました。審査完了までお待ちください。"
          />
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 rounded-2xl p-4 flex gap-3"
            >
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">年齢確認は未完了です</p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  この画面は審査申請の受付のみです。本人確認書類のアップロード保管はまだ接続していないため、
                  確認済みには管理者の審査後に切り替わります。
                </p>
              </div>
            </motion.div>

            {isRejected && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 rounded-2xl p-4 flex gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">前回の申請は承認されませんでした</p>
                  <p className="text-xs text-red-700 mt-1">内容を確認して、必要であれば再申請してください。</p>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-5 shadow-luxury space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">審査申請について</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    本番運用では、提出書類の保管先と管理者審査フローを接続してから利用してください。
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  申請後のステータスは「審査中」になります
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  管理者が承認するまで「確認済み」にはなりません
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                className="w-full h-12 rounded-xl font-semibold"
                disabled={submitAgeVerification.isPending}
                onClick={handleSubmit}
              >
                {submitAgeVerification.isPending ? "申請中..." : "年齢確認を申請する"}
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </AromaLayout>
  );
}

function StatusPanel({
  tone,
  icon,
  title,
  text,
}: {
  tone: "green" | "blue";
  icon: ReactNode;
  title: string;
  text: string;
}) {
  const styles = tone === "green"
    ? "bg-green-50 text-green-800"
    : "bg-blue-50 text-blue-800";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${styles} rounded-2xl p-6 flex flex-col items-center gap-3 text-center`}
    >
      {icon}
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm opacity-80">{text}</p>
    </motion.div>
  );
}
