import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Camera, Save, Instagram, Twitter, User, ChevronDown, Eye } from "lucide-react";
import { Link } from "wouter";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function TherapistProfile() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login");
  }, [session, isLoading]);

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

  useEffect(() => {
    if (p) setForm({
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
  }, [p]);

  const updateMut = trpc.therapist.updateProfile.useMutation({
    onSuccess: () => {
      utils.therapist.getMyProfile.invalidate();
      toast.success("プロフィールを更新しました");
    },
    onError: e => toast.error(e.message),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("5MB以下の画像を選択してください"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setForm(f => ({ ...f, profileImageUrl: data.url }));
        toast.success("画像をアップロードしました");
      } else {
        // Fallback: use object URL for preview
        const objectUrl = URL.createObjectURL(file);
        setForm(f => ({ ...f, profileImageUrl: objectUrl }));
        toast.info("プレビューを表示しています（保存後に反映されます）");
      }
    } catch {
      toast.error("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    updateMut.mutate({
      ...form,
      age: form.age ? parseInt(form.age) : undefined,
      height: form.height ? parseInt(form.height) : undefined,
    });
  };

  const fields = [
    { key: "displayName", label: "源氏名", placeholder: "表示名を入力", required: true },
    { key: "catchphrase", label: "キャッチフレーズ", placeholder: "一言アピール" },
    { key: "age", label: "年齢", placeholder: "例: 24", type: "number" },
    { key: "height", label: "身長 (cm)", placeholder: "例: 160", type: "number" },
    { key: "bodyType", label: "スタイル", placeholder: "例: スレンダー" },
  ];

  return (
    <AromaLayout title="プロフィール編集" showBack backHref="/therapist/dashboard">
      <div className="px-4 py-6 space-y-6 pb-24">
        {/* Avatar upload */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-2">
          <div className="relative">
            <AromaAvatar name={form.displayName || p?.displayName} src={form.profileImageUrl} size="xl" />
            <label className="absolute bottom-0 right-0 w-9 h-9 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-white">
              <Camera className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {uploading ? "アップロード中..." : "タップして写真を変更"}
          </p>
        </motion.div>

        {/* Profile fields */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-luxury p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />基本情報
          </h3>
          {fields.map(f => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
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

        {/* Self introduction */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl shadow-luxury p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">自己紹介</h3>
          <Textarea
            value={form.selfIntroduction}
            onChange={e => setForm(f => ({ ...f, selfIntroduction: e.target.value }))}
            placeholder="あなたの魅力を伝えましょう..."
            className="rounded-xl resize-none text-sm"
            rows={5}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{form.selfIntroduction.length}/500</p>
        </motion.div>

        {/* SNS links */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-luxury p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">SNSリンク</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-pink-500" />Instagram URL
              </Label>
              <Input
                value={form.instagramUrl}
                onChange={e => setForm(f => ({ ...f, instagramUrl: e.target.value }))}
                placeholder="https://instagram.com/..."
                className="rounded-xl h-10 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Twitter className="w-3.5 h-3.5 text-sky-500" />Twitter/X URL
              </Label>
              <Input
                value={form.twitterUrl}
                onChange={e => setForm(f => ({ ...f, twitterUrl: e.target.value }))}
                placeholder="https://twitter.com/..."
                className="rounded-xl h-10 text-sm"
              />
            </div>
          </div>
        </motion.div>

        <Button
          className="w-full h-12 rounded-xl gradient-luxury text-white font-semibold"
          onClick={handleSave}
          disabled={updateMut.isPending || !form.displayName.trim()}
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMut.isPending ? "保存中..." : "プロフィールを保存"}
        </Button>

        <Link href="/therapist/my-profile">
          <Button variant="outline" className="w-full h-10 rounded-xl text-sm border-primary text-primary">
            <Eye className="w-4 h-4 mr-2" />
            公開プロフィールを確認する
          </Button>
        </Link>
      </div>
    </AromaLayout>
  );
}
