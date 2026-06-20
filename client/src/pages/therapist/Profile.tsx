import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Camera,
  Clock,
  Eye,
  Home,
  Link as LinkIcon,
  MessageCircle,
  PlusSquare,
  Save,
  Shield,
  Twitter,
  User,
} from "lucide-react";
import { AromaAvatar, AromaLayout } from "@/components/AromaLayout";
import { ImageCropper, useAvatarCrop } from "@/components/ImageCropper";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const navItems = [
  {
    href: "/therapist/dashboard",
    icon: <Home className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Home className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "ホーム",
  },
  {
    href: "/therapist/shifts",
    icon: <Clock className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Clock className="w-[26px] h-[26px]" strokeWidth={2.5} />,
    label: "出勤",
  },
  {
    href: "/therapist/posts",
    icon: <PlusSquare className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <PlusSquare className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "投稿",
  },
  {
    href: "/messages",
    icon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "DM",
  },
  {
    href: "/therapist/profile",
    icon: <User className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <User className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "プロフィール",
  },
];

const fields = [
  { key: "displayName", label: "表示名", placeholder: "例: 佐藤 あおい", required: true },
  { key: "catchphrase", label: "キャッチコピー", placeholder: "例: 癒しの時間をお届けします" },
  { key: "age", label: "年齢", placeholder: "例: 24", type: "number" },
  { key: "height", label: "身長(cm)", placeholder: "例: 160", type: "number" },
  { key: "bodyType", label: "スタイル", placeholder: "例: スレンダー" },
];

export default function TherapistProfile() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const utils = trpc.useUtils();
  const { cropOpen, pendingFile, openCropper, closeCropper } = useAvatarCrop();

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login");
  }, [session, isLoading, navigate]);

  const { data: profile } = trpc.therapist.getMyProfile.useQuery(undefined, { enabled: !!session });
  const p = profile as any;

  const [form, setForm] = useState({
    displayName: "",
    catchphrase: "",
    selfIntroduction: "",
    age: "",
    height: "",
    bodyType: "",
    instagramUrl: "",
    twitterUrl: "",
    profileImageUrl: "",
  });
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!p) return;
    setForm({
      displayName: p.displayName ?? "",
      catchphrase: p.catchphrase ?? "",
      selfIntroduction: p.selfIntroduction ?? "",
      age: String(p.age ?? ""),
      height: String(p.height ?? ""),
      bodyType: p.bodyType ?? "",
      instagramUrl: p.instagramUrl ?? "",
      twitterUrl: p.twitterUrl ?? "",
      profileImageUrl: p.profileImageUrl ?? "",
    });
    setPreviewUrl(p.profileImageUrl ?? "");
  }, [p]);

  const updateMut = trpc.therapist.updateProfile.useMutation({
    onSuccess: () => {
      utils.therapist.getMyProfile.invalidate();
      toast.success("プロフィールを更新しました");
    },
    onError: e => toast.error(e.message),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("10MB以下の画像を選択してください");
      e.target.value = "";
      return;
    }
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
      setForm(f => ({ ...f, profileImageUrl: data.url }));
      toast.success("画像をアップロードしました");
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("アップロードに失敗しました。通信状況を確認して、もう一度お試しください");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    updateMut.mutate({
      ...form,
      age: form.age ? parseInt(form.age, 10) : undefined,
      height: form.height ? parseInt(form.height, 10) : undefined,
    });
  };

  return (
    <AromaLayout title="プロフィール編集" showBack backHref="/therapist/dashboard" showNav navItems={navItems}>
      <div className="px-4 py-6 space-y-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="relative">
            <AromaAvatar name={form.displayName || p?.displayName} src={previewUrl || form.profileImageUrl} size="xl" />
            <label className="absolute bottom-0 right-0 w-9 h-9 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-white">
              <Camera className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {uploading ? "アップロード中..." : "タップして写真を変更できます"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-luxury p-4 space-y-4"
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            基本情報
          </h3>
          {fields.map(f => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                {f.label}
                {f.required && <span className="text-red-400 ml-0.5">*</span>}
              </Label>
              <Input
                type={f.type ?? "text"}
                value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="rounded-xl h-10 text-sm"
              />
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl shadow-luxury p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold text-foreground">自己紹介</h3>
          <Textarea
            value={form.selfIntroduction}
            onChange={e => setForm(f => ({ ...f, selfIntroduction: e.target.value }))}
            placeholder="得意な施術や雰囲気、お客様へのメッセージを入力してください"
            className="rounded-xl resize-none text-sm"
            rows={5}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{form.selfIntroduction.length}/500</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-luxury p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold text-foreground">SNSリンク</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-primary" />
                SNS URL
              </Label>
              <Input
                value={form.instagramUrl}
                onChange={e => setForm(f => ({ ...f, instagramUrl: e.target.value }))}
                placeholder="https://example.com/..."
                className="rounded-xl h-10 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Twitter className="w-3.5 h-3.5 text-sky-500" />
                X URL
              </Label>
              <Input
                value={form.twitterUrl}
                onChange={e => setForm(f => ({ ...f, twitterUrl: e.target.value }))}
                placeholder="https://x.com/..."
                className="rounded-xl h-10 text-sm"
              />
            </div>
          </div>
        </motion.div>

        <Button
          className="w-full h-12 rounded-xl gradient-luxury text-white font-semibold"
          onClick={handleSave}
          disabled={updateMut.isPending || uploading || !form.displayName.trim()}
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMut.isPending ? "保存中..." : "プロフィールを保存"}
        </Button>

        <Link href="/therapist/my-profile">
          <Button variant="outline" className="w-full h-10 rounded-xl text-sm border-primary text-primary">
            <Eye className="w-4 h-4 mr-2" />
            公開プロフィールを確認
          </Button>
        </Link>
        <Link href="/security">
          <Button variant="outline" className="w-full h-10 rounded-xl text-sm border-gray-300 text-gray-600">
            <Shield className="w-4 h-4 mr-2" />
            セキュリティ設定
          </Button>
        </Link>
      </div>

      <ImageCropper
        open={cropOpen}
        onClose={closeCropper}
        onCropComplete={handleCropComplete}
        imageFile={pendingFile}
        aspectRatio={1}
        title="プロフィール画像を調整"
      />
    </AromaLayout>
  );
}
