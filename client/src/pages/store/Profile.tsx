import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Home, Calendar, Users, TrendingUp, MessageCircle, Camera, Shield } from "lucide-react";
import { Link } from "wouter";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { ImageCropper, useAvatarCrop } from "@/components/ImageCropper";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
  "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
  "熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

const navItems = [
  { href: "/store/dashboard", icon: <Home className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Home className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "ホーム" },
  { href: "/store/reservations", icon: <Calendar className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Calendar className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "予約" },
  { href: "/store/therapists", icon: <Users className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <Users className="w-[26px] h-[26px]" strokeWidth={2.5} />, label: "スタッフ" },
  { href: "/store/sales", icon: <TrendingUp className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <TrendingUp className="w-[26px] h-[26px]" strokeWidth={2.5} />, label: "売上" },
  { href: "/messages", icon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />, activeIcon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />, label: "DM" },
];

export default function StoreProfile() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const { cropOpen, pendingFile, openCropper, closeCropper } = useAvatarCrop();
  useEffect(() => { if (!isLoading && (!session || session.role !== "store")) navigate("/store/login"); }, [session, isLoading]);
  const { data: store, refetch } = trpc.store.getMyStore.useQuery(undefined, { enabled: !!session });
  const s = store as any;
  const [form, setForm] = useState({
    name: "",
    prefecture: "",
    city: "",
    address: "",
    phone: "",
    description: "",
    openHours: "",
    closeHours: "",
    regularHoliday: "",
    access: "",
    logoUrl: "",
  });
  const [previewLogoUrl, setPreviewLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (s) setForm({
      name: s.name ?? "",
      prefecture: s.prefecture ?? "",
      city: s.city ?? "",
      address: s.address ?? "",
      phone: s.phone ?? "",
      description: s.description ?? "",
      openHours: s.openHours ?? "",
      closeHours: s.closeHours ?? "",
      regularHoliday: s.regularHoliday ?? "",
      access: s.access ?? "",
      logoUrl: s.logoUrl ?? "",
    });
    setPreviewLogoUrl(s?.logoUrl ?? "");
  }, [s]);

  const updateMut = trpc.store.updateProfile.useMutation({
    onSuccess: () => { toast.success("プロフィールを更新しました"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("10MB以下の画像を選択してください"); return; }
    openCropper(file);
    e.target.value = "";
  };

  const handleCropComplete = async (croppedUrl: string, blob: Blob) => {
    setPreviewLogoUrl(croppedUrl);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "logo.jpg");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setForm(f => ({ ...f, logoUrl: data.url }));
        toast.success("ロゴ画像をアップロードしました");
      } else {
        setForm(f => ({ ...f, logoUrl: croppedUrl }));
        toast.info("プレビューを表示中（保存ボタンで確定）");
      }
    } catch {
      toast.error("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    updateMut.mutate({
      name: form.name,
      prefecture: form.prefecture,
      city: form.city,
      address: form.address,
      phone: form.phone,
      description: form.description,
      openHours: form.openHours,
      closeHours: form.closeHours,
      regularHoliday: form.regularHoliday,
      access: form.access,
      logoUrl: form.logoUrl || undefined,
    });
  };

  return (
    <AromaLayout title="店舗設定" showBack backHref="/store/dashboard" showNav navItems={navItems}>
      <div className="px-4 py-4 space-y-4 pb-8">
        {/* Store logo with crop */}
        <div className="flex flex-col items-center mb-2 gap-2">
          <div className="relative">
            <AromaAvatar name={form.name || s?.name} src={previewLogoUrl || form.logoUrl} size="xl" />
            <label className="absolute bottom-0 right-0 w-9 h-9 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-white">
              <Camera className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {uploading ? "アップロード中..." : "タップして店舗ロゴを変更（切り取り可能）"}
          </p>
        </div>

        <div>
          <Label>店舗名</Label>
          <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="mt-1 rounded-xl" placeholder="店舗名を入力" />
        </div>

        <div>
          <Label>都道府県</Label>
          <Select value={form.prefecture} onValueChange={v => setForm(f => ({...f, prefecture: v}))}>
            <SelectTrigger className="mt-1 rounded-xl">
              <SelectValue placeholder="都道府県を選択" />
            </SelectTrigger>
            <SelectContent>
              {PREFECTURES.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>市区町村</Label>
          <Input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} className="mt-1 rounded-xl" placeholder="例: 渋谷区" />
        </div>

        <div>
          <Label>住所（番地以降）</Label>
          <Input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} className="mt-1 rounded-xl" placeholder="例: 道玄坂1-2-3" />
        </div>

        <div>
          <Label>電話番号</Label>
          <Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="mt-1 rounded-xl" placeholder="例: 03-1234-5678" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>営業開始時間</Label>
            <Input type="time" value={form.openHours} onChange={e => setForm(f => ({...f, openHours: e.target.value}))} className="mt-1 rounded-xl" />
          </div>
          <div>
            <Label>営業終了時間</Label>
            <Input type="time" value={form.closeHours} onChange={e => setForm(f => ({...f, closeHours: e.target.value}))} className="mt-1 rounded-xl" />
          </div>
        </div>

        <div>
          <Label>定休日</Label>
          <Input value={form.regularHoliday} onChange={e => setForm(f => ({...f, regularHoliday: e.target.value}))} className="mt-1 rounded-xl" placeholder="例: 毎週月曜日" />
        </div>

        <div>
          <Label>アクセス</Label>
          <Input value={form.access} onChange={e => setForm(f => ({...f, access: e.target.value}))} className="mt-1 rounded-xl" placeholder="例: 渋谷駅徒歩5分" />
        </div>

        <div>
          <Label>店舗説明</Label>
          <Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="mt-1 rounded-xl" rows={4} placeholder="店舗の特徴・魅力を入力" />
        </div>

        <Button className="w-full h-11 rounded-xl gradient-luxury text-white" onClick={handleSave} disabled={updateMut.isPending}>
          保存する
        </Button>
        <Link href="/security">
          <Button variant="outline" className="w-full h-10 rounded-xl text-sm border-gray-300 text-gray-600">
            <Shield className="w-4 h-4 mr-2" />
            セキュリティ設定（パスワード・クラッシュ）
          </Button>
        </Link>
      </div>

      {/* Image Cropper Dialog */}
      <ImageCropper
        open={cropOpen}
        onClose={closeCropper}
        onCropComplete={handleCropComplete}
        imageFile={pendingFile}
        aspectRatio={1}
        title="店舗ロゴをトリミング"
      />
    </AromaLayout>
  );
}
