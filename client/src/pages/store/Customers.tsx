import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { UserCheck, Search, ShieldX } from "lucide-react";
import { AromaLayout, AromaAvatar, LevelBadge } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function StoreCustomers() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [search, setSearch] = useState("");
  useEffect(() => { if (!isLoading && (!session || session.role !== "store")) navigate("/store/login"); }, [session, isLoading]);
  const { data: customers, refetch } = trpc.store.getCustomers.useQuery(undefined, { enabled: !!session });
  const addNgMut = trpc.store.addNgCustomer.useMutation({ onSuccess: () => { toast.success("NGリストに追加しました"); refetch(); }, onError: e => toast.error(e.message) });
  const list = ((customers as any[]) ?? []).filter((c: any) => !search || c.displayName?.includes(search));
  return (
    <AromaLayout title="顧客管理" showBack backHref="/store/dashboard">
      <div className="px-4 py-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="名前で検索" className="pl-9 h-9 rounded-xl" /></div>
      </div>
      <div className="px-4 space-y-3">
        {list.map((c: any, i: number) => (
          <motion.div key={c.customerId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-luxury flex items-center gap-3">
            <AromaAvatar name={c.displayName} src={c.profileImageUrl} size="md" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">{c.displayName}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <LevelBadge level={c.level ?? 1} />
                <span className="text-xs text-muted-foreground">累計¥{(c.totalSpent ?? 0).toLocaleString()}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => addNgMut.mutate({ customerId: c.customerId, reason: "店舗判断" })}>
              <ShieldX className="w-3 h-3 mr-1" />NG
            </Button>
          </motion.div>
        ))}
        {list.length === 0 && <div className="text-center py-12 text-muted-foreground"><UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">顧客データがありません</p></div>}
      </div>
    </AromaLayout>
  );
}
