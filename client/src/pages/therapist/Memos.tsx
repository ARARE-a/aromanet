import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, Search } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TherapistMemos() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [memoText, setMemoText] = useState("");
  useEffect(() => { if (!isLoading && (!session || session.role !== "therapist")) navigate("/therapist/login"); }, [session, isLoading]);
  const { data: memos, refetch } = trpc.therapist.getCustomerMemos.useQuery(undefined, { enabled: !!session });
  const upsertMut = trpc.therapist.upsertCustomerMemo.useMutation({ onSuccess: () => { toast.success("メモを保存しました"); setEditing(null); refetch(); }, onError: e => toast.error(e.message) });
  const list = ((memos as any[]) ?? []).filter((m: any) => !search || m.customerName?.includes(search));
  return (
    <AromaLayout title="顧客メモ" showBack backHref="/therapist/dashboard">
      <div className="px-4 py-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="顧客名で検索" className="pl-9 h-9 rounded-xl" /></div>
      </div>
      <div className="px-4 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">顧客メモがありません</p></div>
        ) : list.map((m: any, i: number) => (
          <motion.div key={m.customerId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-luxury">
            <div className="flex items-center gap-2 mb-2">
              <AromaAvatar name={m.customerName} size="sm" />
              <span className="text-sm font-semibold text-foreground">{m.customerName}</span>
            </div>
            {editing === m.customerId ? (
              <div className="space-y-2">
                <Textarea value={memoText} onChange={e => setMemoText(e.target.value)} className="rounded-xl text-sm" rows={3} />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-7 text-xs rounded-lg gradient-luxury text-white" onClick={() => upsertMut.mutate({ customerId: m.customerId, preferences: memoText })}>保存</Button>
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs rounded-lg" onClick={() => setEditing(null)}>キャンセル</Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">{m.memo || "メモなし"}</p>
                <button onClick={() => { setEditing(m.customerId); setMemoText(m.memo ?? ""); }} className="mt-2 text-xs text-primary hover:underline">編集</button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </AromaLayout>
  );
}
