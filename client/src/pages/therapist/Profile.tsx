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

export default function TherapistProfile() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  useEffect(() => { if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login"); }, [session, isLoading]);
  const { data: profile, refetch } = trpc.therapist.getMyProfile.useQuery(undefined, { enabled: !!session });
  const p = profile as any;
  const [form, setForm] = useState({ displayName: "", catchphrase: "", selfIntroduction: "", age: "", height: "", bodyType: "", instagramUrl: "", twitterUrl: "" });
  useEffect(() => { if (p) setForm({ displayName: p.displayName ?? "", catchphrase: p.catchphrase ?? "", selfIntroduction: p.selfIntroduction ?? "", age: String(p.age ?? ""), height: String(p.height ?? ""), bodyType: p.bodyType ?? "", instagramUrl: p.instagramUrl ?? "", twitterUrl: p.twitterUrl ?? "" }); }, [p]);
  const updateMut = trpc.therapist.updateProfile.useMutation({ onSuccess: () => { toast.success("プロフィールを更新しました"); refetch(); }, onError: e => toast.error(e.message) });
  return (
    <AromaLayout title="プロフィール編集" showBack backHref="/therapist/dashboard">
      <div className="px-4 py-4 space-y-4">
        <div className="flex justify-center mb-2"><AromaAvatar name={p?.displayName} src={p?.profileImageUrl} size="xl" /></div>
        {[{ key: "displayName", label: "源氏名" }, { key: "catchphrase", label: "キャッチフレーズ" }, { key: "age", label: "年齢" }, { key: "height", label: "身長（cm）" }, { key: "bodyType", label: "スタイル" }, { key: "instagramUrl", label: "Instagram URL" }, { key: "twitterUrl", label: "Twitter URL" }].map(f => (
          <div key={f.key}><Label>{f.label}</Label><Input value={(form as any)[f.key]} onChange={e => setForm(prev => ({...prev, [f.key]: e.target.value}))} className="mt-1 rounded-xl" /></div>
        ))}
        <div><Label>自己紹介</Label><Textarea value={form.selfIntroduction} onChange={e => setForm(f => ({...f, selfIntroduction: e.target.value}))} className="mt-1 rounded-xl" rows={4} /></div>
        <Button className="w-full h-11 rounded-xl gradient-luxury text-white" onClick={() => updateMut.mutate({ ...form, age: form.age ? parseInt(form.age) : undefined, height: form.height ? parseInt(form.height) : undefined })} disabled={updateMut.isPending}>保存する</Button>
      </div>
    </AromaLayout>
  );
}
