import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Clock, FileImage, Shield, Upload } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function CustomerVerification() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const utils = trpc.useUtils();

  const [documentType, setDocumentType] = useState("driver_license");
  const [documentImageUrl, setDocumentImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading, navigate]);

  const { data: profile } = trpc.customer.getMyProfile.useQuery(undefined, { enabled: !!session });
  const { data: verificationStatus } = trpc.admin.getVerificationStatus.useQuery(undefined, { enabled: !!session });
  const submitAgeVerification = trpc.admin.submitAgeVerification.useMutation({
    onSuccess: async () => {
      setDocumentImageUrl("");
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
  const verification = verificationStatus as any;
  const status = p?.verificationStatus ?? verification?.status ?? "not_submitted";
  const isVerified = Boolean(p?.isVerified);
  const isPending = status === "pending";
  const isRejected = status === "rejected";
  const latestDocumentUrl = verification?.documentImageUrl;
  const adminNote = verification?.adminNote;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください。");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("10MB以下の画像を選択してください。");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file, file.name || "age-verification.jpg");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data?.error || "Upload failed");
      }
      setDocumentImageUrl(data.url);
      toast.success("書類画像をアップロードしました。");
    } catch (error) {
      console.error("Age verification upload failed:", error);
      toast.error("アップロードに失敗しました。通信状況を確認してもう一度お試しください。");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!documentImageUrl) {
      toast.error("先に本人確認書類の画像をアップロードしてください。");
      return;
    }
    submitAgeVerification.mutate({
      method: "document_upload",
      documentType,
      documentImageUrl,
    });
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
                  顔写真付きの本人確認書類をアップロードして申請してください。管理者が確認するまで「確認済み」にはなりません。
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
                  <p className="text-xs text-red-700 mt-1">
                    {adminNote || "内容を確認して、必要であれば再申請してください。"}
                  </p>
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
                  <h3 className="font-semibold text-foreground">提出書類</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    運転免許証、マイナンバーカード、パスポートなどを利用できます。
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">書類種別</Label>
                <select
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="driver_license">運転免許証</option>
                  <option value="my_number_card">マイナンバーカード</option>
                  <option value="passport">パスポート</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">書類画像</Label>
                <label className="flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-5 text-center">
                  {documentImageUrl ? (
                    <>
                      <FileImage className="w-8 h-8 text-primary" />
                      <p className="mt-2 text-sm font-semibold text-foreground">アップロード済み</p>
                      <p className="mt-1 text-xs text-muted-foreground">別の画像に変更する場合はタップしてください</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-primary" />
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {uploading ? "アップロード中..." : "画像をアップロード"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">10MB以下の画像を選択してください</p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading || submitAgeVerification.isPending}
                    onChange={handleFileSelect}
                  />
                </label>
              </div>

              {latestDocumentUrl && !documentImageUrl && (
                <p className="text-xs text-muted-foreground">前回提出済みの書類があります。再申請する場合は新しい画像をアップロードしてください。</p>
              )}

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
                disabled={uploading || submitAgeVerification.isPending || !documentImageUrl}
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
