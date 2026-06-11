import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Camera, Save } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function CustomerEditProfile() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const utils = trpc.useUtils();

  const { data: profile } = trpc.customer.getMyProfile.useQuery(undefined, { enabled: !!session });
  const p = profile as any;

  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading]);

  useEffect(() => {
    if (p) {
      setNickname(p.nickname ?? "");
      setAvatarUrl(p.profileImageUrl ?? "");
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.url);
        toast.success("画像をアップロードしました");
      } else {
        toast.error("画像のアップロードに失敗しました");
      }
    } catch {
      toast.error("画像のアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    updateMut.mutate({ nickname: nickname || undefined, profileImageUrl: avatarUrl || undefined });
  };

  return (
    <AromaLayout title="プロフィール編集" showBack>
      <div className="px-4 py-6 space-y-6 pb-24">
        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3">
          <div className="relative">
            <AromaAvatar name={nickname || p?.nickname} src={avatarUrl} size="xl" />
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-md">
              <Camera className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
          {uploading && <p className="text-xs text-muted-foreground">アップロード中...</p>}
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
          className="w-full h-12 rounded-xl font-semibold"
          onClick={handleSave}
          disabled={updateMut.isPending || !nickname.trim()}
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMut.isPending ? "保存中..." : "保存する"}
        </Button>
      </div>
    </AromaLayout>
  );
}
