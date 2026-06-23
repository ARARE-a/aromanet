import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Edit3, Link2, MessageCircle, Search, Star, UserX } from "lucide-react";
import { toast } from "sonner";
import { AromaAvatar, AromaLayout } from "@/components/AromaLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";

type TherapistEditForm = {
  displayName: string;
  catchphrase: string;
  selfIntroduction: string;
  specialties: string;
  backRate: string;
  isPublic: boolean;
};

const defaultForm: TherapistEditForm = {
  displayName: "",
  catchphrase: "",
  selfIntroduction: "",
  specialties: "",
  backRate: "50",
  isPublic: true,
};

export default function StoreTherapists() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [search, setSearch] = useState("");
  const [editingTherapist, setEditingTherapist] = useState<any | null>(null);
  const [form, setForm] = useState<TherapistEditForm>(defaultForm);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "store")) navigate("/store/login");
  }, [session, isLoading, navigate]);

  const { data: therapists } = trpc.store.getTherapists.useQuery(undefined, { enabled: !!session });
  const updateTherapist = trpc.store.updateTherapist.useMutation({
    onSuccess: () => {
      toast.success("セラピスト情報を更新しました");
      utils.store.getTherapists.invalidate();
      setEditingTherapist(null);
    },
    onError: e => toast.error(e.message),
  });

  const list = ((therapists as any[]) ?? []).filter((t: any) =>
    !search || t.displayName?.includes(search)
  );

  const openEdit = (therapist: any) => {
    setEditingTherapist(therapist);
    setForm({
      displayName: therapist.displayName ?? "",
      catchphrase: therapist.catchphrase ?? "",
      selfIntroduction: therapist.selfIntroduction ?? therapist.bio ?? "",
      specialties: therapist.specialties ?? "",
      backRate: String(therapist.backRate ?? "50"),
      isPublic: Boolean(therapist.isPublic),
    });
  };

  const submitEdit = () => {
    if (!editingTherapist || !form.displayName.trim()) {
      toast.error("表示名を入力してください");
      return;
    }
    updateTherapist.mutate({
      id: editingTherapist.id,
      displayName: form.displayName.trim(),
      catchphrase: form.catchphrase.trim(),
      selfIntroduction: form.selfIntroduction.trim(),
      bio: form.selfIntroduction.trim(),
      specialties: form.specialties.trim(),
      isPublic: form.isPublic,
      backRate: Number(form.backRate || 0),
    });
  };

  return (
    <AromaLayout title="スタッフ管理" showBack backHref="/store/dashboard">
      <div className="px-4 py-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="名前で検索" className="pl-9 h-9 rounded-xl" />
        </div>
        <Button size="sm" className="h-9 rounded-xl gradient-luxury text-white" onClick={() => navigate("/store/affiliations")}>
          <Link2 className="w-4 h-4 mr-1" />招待
        </Button>
      </div>

      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => navigate("/store/affiliations")}
          className="w-full rounded-2xl bg-white p-3 text-left shadow-luxury active:scale-[0.99] transition"
        >
          <div className="text-sm font-semibold text-foreground">セラピスト登録URLを発行</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            URLから登録したセラピストは、この店舗の所属として自動登録されます。
          </div>
        </button>
      </div>

      <div className="px-4 space-y-3 pb-24">
        {list.map((t: any, i: number) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-luxury"
          >
            <div className="flex items-center gap-3">
              <AromaAvatar src={t.profileImageUrl} name={t.displayName} size="md" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-sm truncate">{t.displayName}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500" />
                  {Number(t.reviewAvg ?? 4.5).toFixed(1)} ・ {t.reviewCount ?? 0}件 ・ バック率{Number(t.backRate ?? 50)}%
                </div>
                <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.isPublic ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                  {t.isPublic ? "公開中" : "非公開"}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs" onClick={() => openEdit(t)}>
                <Edit3 className="w-3.5 h-3.5 mr-1" />編集
              </Button>
              <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs"
                onClick={() => navigate(`/messages?therapistId=${t.id}&storeId=${session?.storeId}&type=store_therapist`)}>
                <MessageCircle className="w-3.5 h-3.5 mr-1" />DM
              </Button>
              <Link href={`/therapist/${t.id}`}>
                <Button variant="outline" size="sm" className="h-9 w-full rounded-xl text-xs">公開ページ</Button>
              </Link>
            </div>
          </motion.div>
        ))}

        {list.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <UserX className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">スタッフが登録されていません</p>
            <p className="text-xs mt-1">招待URLを発行して、セラピスト本人に登録してもらってください。</p>
          </div>
        )}
      </div>

      <Dialog open={!!editingTherapist} onOpenChange={(open) => !open && setEditingTherapist(null)}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[86dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>セラピスト情報を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>表示名</Label>
              <Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>キャッチコピー</Label>
              <Input value={form.catchphrase} onChange={e => setForm(f => ({ ...f, catchphrase: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>得意施術</Label>
              <Input value={form.specialties} onChange={e => setForm(f => ({ ...f, specialties: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>プロフィール本文</Label>
              <Textarea value={form.selfIntroduction} onChange={e => setForm(f => ({ ...f, selfIntroduction: e.target.value }))} rows={4} className="mt-1 rounded-xl resize-none" />
            </div>
            <div>
              <Label>バック率（今後適用）</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.backRate}
                onChange={e => setForm(f => ({ ...f, backRate: e.target.value }))}
                className="mt-1 rounded-xl"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">変更だけでは過去給与は変わりません。対象月へ反映する場合は給与管理で「給与を再計算」を押してください。</p>
            </div>
            <label className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
              <input type="checkbox" checked={form.isPublic} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))} />
              公開ページに表示する
            </label>
            <Button className="w-full h-11 rounded-xl gradient-luxury text-white" onClick={submitEdit} disabled={updateTherapist.isPending}>
              保存する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AromaLayout>
  );
}
