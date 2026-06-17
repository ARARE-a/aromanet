import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Camera, Save, Shield } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { ImageCropper, useAvatarCrop } from "@/components/ImageCropper";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CustomerEditProfile() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const utils = trpc.useUtils();
  const { cropOpen, pendingFile, openCropper, closeCropper } = useAvatarCrop();

  const { data: profile } = trpc.customer.getMyProfile.useQuery(undefined, { enabled: !!session });
  const p = profile as any;

  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading]);

  useEffect(() => {
    if (p) {
      setNickname(p.nickname ?? "");
      setAvatarUrl(p.profileImageUrl ?? "");
      setPreviewUrl(p.profileImageUrl ?? "");
    }
  }, [p]);

  const updateMut = trpc.customer.updateProfile.useMutation({
    onSuccess: () => {
      utils.customer.getMyProfile.invalidate();
      toast.success("プロフィールを更新しました");
      navigate("/my/page");
    },
    onError: () => toast.error("更新に失敗しました"),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("10MB以下の画像を選択してください"); return; }
    openCropper(file);
    e.target.value = "";
  };

  const handleCropComplete = async (croppedUrl: string, blob: Blob) => {
    setPreviewUrl(croppedUrl);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const message = await res.json().then(data => data?.error).catch(() => null);
        throw new Error(message || "Upload failed");
      }
      const data = await res.json();
      setAvatarUrl(data.url);
      toast.success("画像をアップロードしました");
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("アップロードに失敗しました。通信状況を確認してもう一度お試しください");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    // displayName と nickname を両方更新して表示の不一致を防ぐ
    updateMut.mutate({
      displayName: nickname || undefined,
      nickname: nickname || undefined,
      profileImageUrl: avatarUrl || undefined,
    });
  };

  return (
    <AromaLayout title="プロフィール編集" showBack>
      <div className="px-4 py-6 space-y-6 pb-24">
        {/* Avatar with crop */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3">
          <div className="relative">
            <AromaAvatar name={nickname || p?.nickname} src={previewUrl || avatarUrl} size="xl" />
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-md">
              <Camera className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {uploading ? "アップロード中..." : "タップして写真を変更（切り取り可能）"}
          </p>
        </motion.div>

        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">ニックネーム</Label>
            <Input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="ニックネームを入力"
              className="rounded-xl h-11"
              maxLength={30}
            />
          </div>
        </motion.div>

        <Button
          className="w-full h-12 rounded-xl font-semibold gradient-luxury text-white"
          onClick={handleSave}
          disabled={updateMut.isPending || !nickname.trim()}
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMut.isPending ? "保存中..." : "保存する"}
        </Button>
        <a href="/security">
          <Button variant="outline" className="w-full h-10 rounded-xl text-sm border-gray-300 text-gray-600">
            <Shield className="w-4 h-4 mr-2" />
            セキュリティ設定（パスワード・クラッシュ）
          </Button>
        </a>
      </div>

      {/* Image Cropper Dialog */}
      <ImageCropper
        open={cropOpen}
        onClose={closeCropper}
        onCropComplete={handleCropComplete}
        imageFile={pendingFile}
        aspectRatio={1}
        title="プロフィール画像をトリミング"
      />
    </AromaLayout>
  );
}
