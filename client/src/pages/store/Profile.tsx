import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function StoreProfile() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  useEffect(() => { if (!isLoading && (!session || session.role !== "store")) navigate("/store/login"); }, [session, isLoading]);
  const { data: store, refetch } = trpc.store.getMyStore.useQuery(undefined, { enabled: !!session });
  const s = store as any;
  const [form, setForm] = useState({ name: "", area: "", address: "", phone: "", description: "", businessHours: "", website: "" });
  useEffect(() => { if (s) setForm({ name: s.name ?? "", area: s.area ?? "", address: s.address ?? "", phone: s.phone ?? "", description: s.description ?? "", businessHours: s.businessHours ?? "", website: s.website ?? "" }); }, [s]);
  const updateMut = trpc.store.updateProfile.useMutation({ onSuccess: () => { toast.success("プロフィールを更新しました"); refetch(); }, onError: e => toast.error(e.message) });
  return (
    <AromaLayout title="店舗設定" showBack backHref="/store/dashboard">
      <div className="px-4 py-4 space-y-4">
        <div className="flex justify-center mb-2"><AromaAvatar name={s?.name} src={s?.logoUrl} size="xl" /></div>
        {[
          { key: "name", label: "店舗名" }, { key: "area", label: "エリア" }, { key: "address", label: "住所" },
          { key: "phone", label: "電話番号" }, { key: "website", label: "ウェブサイト" }, { key: "businessHours", label: "営業時間" },
        ].map(f => (
          <div key={f.key}><Label>{f.label}</Label><Input value={(form as any)[f.key]} onChange={e => setForm(prev => ({...prev, [f.key]: e.target.value}))} className="mt-1 rounded-xl" /></div>
        ))}
        <div><Label>店舗説明</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="mt-1 rounded-xl" rows={4} /></div>
        <Button className="w-full h-11 rounded-xl gradient-luxury text-white" onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending}>保存する</Button>
      </div>
    </AromaLayout>
  );
}
