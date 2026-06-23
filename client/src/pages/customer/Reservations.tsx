import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Calendar, Plus } from "lucide-react";
import { toast } from "sonner";
import { AromaLayout, StatusBadge } from "@/components/AromaLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

export default function CustomerReservations() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { session, isLoading } = useSession();
  const [showNew, setShowNew] = useState(false);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [therapistId, setTherapistId] = useState<number | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [notes, setNotes] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login");
  }, [session, isLoading, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const nextStoreId = Number(params.get("storeId"));
    const nextTherapistId = Number(params.get("therapistId"));
    const nextMenuId = Number(params.get("menuId"));
    if (Number.isFinite(nextStoreId) && nextStoreId > 0) setStoreId(nextStoreId);
    if (Number.isFinite(nextTherapistId) && nextTherapistId > 0) setTherapistId(nextTherapistId);
    if (Number.isFinite(nextMenuId) && nextMenuId > 0) setMenuId(nextMenuId);
    if (nextStoreId > 0 || nextTherapistId > 0 || nextMenuId > 0) {
      setShowNew(true);
      setDate(prev => prev || new Date().toISOString().slice(0, 10));
    }
  }, [search]);

  const { data: reservations, refetch } = trpc.customer.getReservations.useQuery(undefined, { enabled: !!session });
  const { data: stores } = trpc.store.search.useQuery({ limit: 50 }, { enabled: showNew });
  const { data: selectedTherapist } = trpc.therapist.getById.useQuery(
    { therapistId: therapistId! },
    { enabled: showNew && !!therapistId },
  );
  const resolvedStoreId = storeId ?? ((selectedTherapist as any)?.storeId ?? null);
  const { data: therapists } = trpc.therapist.getByStore.useQuery({ storeId: resolvedStoreId! }, { enabled: showNew && !!resolvedStoreId });
  const { data: menus } = trpc.store.getPublicMenus.useQuery({ storeId: resolvedStoreId! }, { enabled: showNew && !!resolvedStoreId });

  useEffect(() => {
    const t = selectedTherapist as any;
    if (!storeId && t?.storeId) setStoreId(t.storeId);
  }, [selectedTherapist, storeId]);

  const handleReservationError = (error: { message?: string }) => {
    const nextMessage = error.message || "予約に失敗しました。";
    toast.error(nextMessage);
  };

  const createMut = trpc.reservation.create.useMutation({
    onSuccess: () => {
      toast.success("予約リクエストを送信しました。");
      setShowNew(false);
      refetch();
    },
    onError: handleReservationError,
  });
  const cancelMut = trpc.reservation.cancel.useMutation({
    onSuccess: () => {
      toast.success("予約をキャンセルしました。");
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const list = (reservations as any[]) ?? [];
  const storeList = (stores as any[]) ?? [];
  const therapistList = (therapists as any[]) ?? [];
  const menuList = (menus as any[]) ?? [];

  const handleCreate = () => {
    if (!storeId || !menuId || !date || !startTime) {
      toast.error("店舗、メニュー、日時を入力してください。");
      return;
    }
    createMut.mutate({
      storeId,
      therapistId: therapistId ?? undefined,
      menuId,
      date,
      startTime,
      isNomination: !!therapistId,
      customerNote: notes,
    });
  };

  return (
    <AromaLayout title="予約管理" showBack backHref="/home">
      <div className="px-4 py-3">
        <Button className="w-full h-11 rounded-xl gradient-luxury text-white" onClick={() => {
          setShowNew(true);
          setDate(prev => prev || new Date().toISOString().slice(0, 10));
        }}>
          <Plus className="w-4 h-4 mr-2" />新規予約
        </Button>
      </div>

      <div className="px-4 space-y-3 pb-24">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">予約履歴はまだありません</p>
          </div>
        ) : list.map((r: any, i: number) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-luxury"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{r.date} {r.startTime}{r.endTime ? ` - ${r.endTime}` : ""}</div>
                <div className="text-xs text-muted-foreground truncate">{r.storeName} / {r.menuName}</div>
                {r.therapistName && <div className="text-xs text-muted-foreground truncate">指名: {r.therapistName}</div>}
              </div>
              <StatusBadge status={r.status} />
            </div>
            {expandedId === r.id && (
              <div className="mb-3 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
                <DetailRow label="店舗" value={r.storeName ?? "-"} href={r.storeId ? `/store/${r.storeId}` : undefined} />
                <DetailRow label="セラピスト" value={r.therapistName ?? "指名なし"} href={r.therapistId ? `/therapist/${r.therapistId}` : undefined} />
                <DetailRow label="コース" value={`${r.menuName ?? "-"} ${r.menuDuration ? `(${r.menuDuration}分)` : ""}`} />
                {r.customerNote && (
                  <div>
                    <span>備考</span>
                    <p className="mt-1 text-foreground whitespace-pre-wrap">{r.customerNote}</p>
                  </div>
                )}
                {r.note && (
                  <div>
                    <span>店舗メモ</span>
                    <p className="mt-1 text-foreground whitespace-pre-wrap">{r.note}</p>
                  </div>
                )}
                {r.cancelReason && (
                  <div>
                    <span>キャンセル理由</span>
                    <p className="mt-1 text-red-600 whitespace-pre-wrap">{r.cancelReason}</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">¥{(r.totalAmount ?? 0).toLocaleString()}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                  {expandedId === r.id ? "閉じる" : "詳細"}
                </Button>
                {["pending", "confirmed"].includes(r.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs rounded-lg text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => cancelMut.mutate({ id: r.id, reason: "顧客キャンセル" })}
                  >
                    キャンセル
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[86dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>新規予約</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>店舗を選択</Label>
              <Select value={storeId ? String(storeId) : ""} onValueChange={v => { setStoreId(parseInt(v)); setTherapistId(null); setMenuId(null); }}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="店舗を選択" /></SelectTrigger>
                <SelectContent>{storeList.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {storeId && (
              <>
                <div>
                  <Label>セラピストを選択（任意）</Label>
                  <Select value={therapistId ? String(therapistId) : "none"} onValueChange={v => setTherapistId(v === "none" ? null : parseInt(v))}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="指名なし" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">指名なし</SelectItem>
                      {therapistList.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.displayName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>メニューを選択</Label>
                  <Select value={menuId ? String(menuId) : ""} onValueChange={v => setMenuId(parseInt(v))}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="メニューを選択" /></SelectTrigger>
                    <SelectContent>{menuList.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.durationMinutes ?? m.duration}分 ¥{(m.price ?? 0).toLocaleString()})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <Label>希望日</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 rounded-xl" min={new Date().toISOString().slice(0, 10)} />
            </div>
            <div>
              <Label>希望時間</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>備考（任意）</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 rounded-xl" rows={2} placeholder="希望や質問があれば入力" />
            </div>
            <Button className="w-full h-11 rounded-xl gradient-luxury text-white" onClick={handleCreate} disabled={createMut.isPending}>
              予約リクエストを送る
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AromaLayout>
  );
}

function DetailRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      {href ? <Link href={href} className="text-primary font-medium text-right">{value}</Link> : <span className="text-foreground text-right">{value}</span>}
    </div>
  );
}
