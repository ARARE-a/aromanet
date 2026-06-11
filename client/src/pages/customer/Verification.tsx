import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, CheckCircle, Upload, AlertCircle } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CustomerVerification() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading]);

  const { data: profile } = trpc.customer.getMyProfile.useQuery(undefined, { enabled: !!session });
  const p = profile as any;
  const isVerified = p?.isVerified;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ファイルサイズは5MB以下にしてください");
      return;
    }
    setUploading(true);
    try {
      // Simulate upload - in production this would upload to S3 and create a verification request
      await new Promise(r => setTimeout(r, 1500));
      setSubmitted(true);
      toast.success("本人確認書類を送信しました。審査には1〜2営業日かかります。");
    } catch {
      toast.error("送信に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AromaLayout title="本人確認" showBack>
      <div className="px-4 py-6 space-y-6 pb-24">
        {isVerified ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <h2 className="text-lg font-semibold text-green-800">本人確認済み</h2>
            <p className="text-sm text-green-600">本人確認が完了しています。すべての機能をご利用いただけます。</p>
          </motion.div>
        ) : submitted ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-blue-50 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
            <Shield className="w-12 h-12 text-blue-500" />
            <h2 className="text-lg font-semibold text-blue-800">審査中</h2>
            <p className="text-sm text-blue-600">書類を受け付けました。1〜2営業日以内に審査結果をお知らせします。</p>
          </motion.div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">本人確認が必要です</p>
                <p className="text-xs text-amber-600 mt-1">一部のサービスをご利用いただくには本人確認が必要です。</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-5 shadow-luxury space-y-4">
              <h3 className="font-semibold text-foreground">提出書類について</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["運転免許証", "マイナンバーカード（表面のみ）", "パスポート"].map(doc => (
                  <li key={doc} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    {doc}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">※ 書類は暗号化して安全に保管されます。第三者への提供は行いません。</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <label className="block">
                <Button className="w-full h-12 rounded-xl font-semibold" disabled={uploading} asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "送信中..." : "書類を選択してアップロード"}
                  </span>
                </Button>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </motion.div>
          </>
        )}
      </div>
    </AromaLayout>
  );
}
