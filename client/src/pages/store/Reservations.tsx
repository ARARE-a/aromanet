import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, Edit3, History, Home, MessageCircle, Plus, ReceiptText, Trash2, TrendingUp, Users } from "lucide-react";
import { addDays, format, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { AromaAvatar, AromaLayout, StatusBadge } from "@/components/AromaLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";

const navItems = [
  {
    href: "/store/dashboard",
    icon: <Home className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Home className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "ホーム",
  },
  {
    href: "/store/reservations",
    icon: <Calendar className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Calendar className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "予約",
  },
  {
    href: "/store/therapists",
    icon: <Users className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <Users className="w-[26px] h-[26px]" strokeWidth={2.5} />,
    label: "スタッフ",
  },
  {
    href: "/store/sales",
    icon: <TrendingUp className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <TrendingUp className="w-[26px] h-[26px]" strokeWidth={2.5} />,
    label: "売上",
  },
  {
    href: "/messages",
    icon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.5} />,
    activeIcon: <MessageCircle className="w-[26px] h-[26px]" strokeWidth={2.5} fill="currentColor" />,
    label: "DM",
  },
];

const STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "pending", label: "確認待ち" },
  { value: "confirmed", label: "確定" },
  { value: "in_service", label: "施術中" },
  { value: "completed", label: "完了" },
  { value: "cancelled", label: "キャンセル" },
];

type FinancialItemForm = {
  label: string;
  amount: string;
  itemType: "option" | "extension" | "discount" | "adjustment";
  backRate: string;
};

const emptyFinancialItem = (): FinancialItemForm => ({
  label: "",
  amount: "",
  itemType: "option",
  backRate: "",
});

export default function StoreReservations() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [date, setDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("pending");
  const [assigningReservationId, setAssigningReservationId] = useState<number | null>(null);
  const [selectedTherapistId, setSelectedTherapistId] = useState("");
  const [selectedRoomByReservation, setSelectedRoomByReservation] = useState<Record<number, string>>({});
  const [editingReservation, setEditingReservation] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ date: "", startTime: "", menuId: "", therapistId: "none", isNomination: false, note: "" });
  const [financialReservation, setFinancialReservation] = useState<any | null>(null);
  const [financialForm, setFinancialForm] = useState<{ optionTotal: string; discountAmount: string; note: string; items: FinancialItemForm[] }>({ optionTotal: "0", discountAmount: "0", note: "", items: [] });
  const [cancelingReservation, setCancelingReservation] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [creatingReservation, setCreatingReservation] = useState(false);
  const [createForm, setCreateForm] = useState({
    customerMode: "new" as "new" | "existing",
    customerId: "",
    customerName: "",
    customerPhone: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "12:00",
    menuId: "",
    therapistId: "",
    roomId: "",
    isNomination: false,
    note: "",
  });

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "store")) navigate("/store/login");
  }, [session, isLoading, navigate]);

  const dateStr = format(date, "yyyy-MM-dd");
  const { data: reservations, refetch } = trpc.reservation.getStoreReservations.useQuery(
    statusFilter === "pending"
      ? { status: "pending", limit: 100 }
      : statusFilter === "all"
        ? { limit: 100 }
        : { date: dateStr, status: statusFilter, limit: 100 },
    { enabled: !!session, refetchOnWindowFocus: true, refetchInterval: 15000 },
  );
  const { data: therapists } = trpc.store.getTherapists.useQuery(undefined, { enabled: !!session });
  const { data: menus } = trpc.store.getMenus.useQuery(undefined, { enabled: !!session });
  const { data: rooms } = trpc.room.getMyRooms.useQuery(undefined, { enabled: !!session });
  const { data: customers } = trpc.store.getCustomers.useQuery(undefined, { enabled: !!session });
  const { data: financialHistory } = trpc.reservation.getFinancialHistory.useQuery(
    { reservationId: financialReservation?.id ?? 0 },
    { enabled: !!financialReservation },
  );

  const updateStatus = trpc.reservation.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("予約ステータスを更新しました");
      refetch();
    },
    onError: e => toast.error(e.message),
  });
  const assignTherapist = trpc.reservation.assignTherapist.useMutation({
    onSuccess: () => {
      toast.success("担当セラピストを割り当てました");
      setAssigningReservationId(null);
      setSelectedTherapistId("");
      refetch();
    },
    onError: e => toast.error(e.message),
  });
  const updateReservation = trpc.reservation.updateReservation.useMutation({
    onSuccess: () => {
      toast.success("予約内容を変更しました");
      setEditingReservation(null);
      refetch();
    },
    onError: e => toast.error(e.message),
  });
  const createReservation = trpc.reservation.createByStore.useMutation({
    onSuccess: () => {
      toast.success("予約を作成しました");
      setCreatingReservation(false);
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const adjustFinancials = trpc.reservation.adjustFinancials.useMutation({
    onSuccess: () => {
      toast.success("金額調整を売上・給与に反映しました");
      setFinancialReservation(null);
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const list = (reservations as any[]) ?? [];
  const therapistList = (therapists as any[]) ?? [];
  const menuList = (menus as any[]) ?? [];
  const roomList = ((rooms as any[]) ?? []).filter((room: any) => room.isAvailable !== false);
  const customerList = (customers as any[]) ?? [];
  const heading =
    statusFilter === "pending" ? "確認待ち一覧" :
      statusFilter === "all" ? "予約一覧" :
        format(date, "M月d日（E）", { locale: ja });

  const emptyText =
    statusFilter === "pending" ? "確認待ちの予約はありません" :
      statusFilter === "all" ? "予約はありません" :
        "この日の予約はありません";

  const openCreate = () => {
    setCreateForm({
      customerMode: "new",
      customerId: "",
      customerName: "",
      customerPhone: "",
      date: dateStr,
      startTime: "12:00",
      menuId: menuList[0]?.id ? String(menuList[0].id) : "",
      therapistId: therapistList[0]?.id ? String(therapistList[0].id) : "",
      roomId: roomList[0]?.id ? String(roomList[0].id) : "",
      isNomination: false,
      note: "",
    });
    setCreatingReservation(true);
  };

  const submitCreate = () => {
    if (!createForm.date || !createForm.startTime || !createForm.menuId || !createForm.therapistId || !createForm.roomId) {
      toast.error("日時・コース・セラピスト・ルームを入力してください");
      return;
    }
    if (createForm.customerMode === "existing" && !createForm.customerId) {
      toast.error("顧客を選択してください");
      return;
    }
    if (createForm.customerMode === "new" && !createForm.customerName.trim()) {
      toast.error("新規顧客名を入力してください");
      return;
    }
    createReservation.mutate({
      customerMode: createForm.customerMode,
      customerId: createForm.customerMode === "existing" ? Number(createForm.customerId) : undefined,
      customerName: createForm.customerMode === "new" ? createForm.customerName.trim() : undefined,
      customerPhone: createForm.customerMode === "new" ? createForm.customerPhone.trim() : undefined,
      date: createForm.date,
      startTime: createForm.startTime,
      menuId: Number(createForm.menuId),
      therapistId: Number(createForm.therapistId),
      roomId: Number(createForm.roomId),
      isNomination: createForm.isNomination,
      note: createForm.note,
    });
  };

  const openEdit = (reservation: any) => {
    setEditingReservation(reservation);
    setEditForm({
      date: reservation.date ?? dateStr,
      startTime: reservation.startTime ?? "12:00",
      menuId: reservation.menuId ? String(reservation.menuId) : "",
      therapistId: reservation.therapistId ? String(reservation.therapistId) : "none",
      isNomination: Boolean(reservation.isNomination || reservation.therapistId),
      note: reservation.note ?? reservation.customerNote ?? "",
    });
  };

  const submitEdit = () => {
    if (!editingReservation || !editForm.date || !editForm.startTime || !editForm.menuId) {
      toast.error("日時とコースを入力してください");
      return;
    }
    updateReservation.mutate({
      id: editingReservation.id,
      date: editForm.date,
      startTime: editForm.startTime,
      menuId: Number(editForm.menuId),
      therapistId: editForm.therapistId === "none" ? null : Number(editForm.therapistId),
      isNomination: editForm.isNomination && editForm.therapistId !== "none",
      note: editForm.note,
    });
  };

  const openFinancialAdjust = (reservation: any) => {
    setFinancialReservation(reservation);
    const items: FinancialItemForm[] = [];
    if ((reservation.optionTotal ?? 0) > 0) {
      items.push({ label: "現場追加", amount: String(reservation.optionTotal ?? 0), itemType: "option", backRate: "" });
    }
    if ((reservation.discountAmount ?? 0) > 0) {
      items.push({ label: "割引", amount: String(reservation.discountAmount ?? 0), itemType: "discount", backRate: "" });
    }
    setFinancialForm({
      optionTotal: String(reservation.optionTotal ?? 0),
      discountAmount: String(reservation.discountAmount ?? 0),
      note: reservation.note ?? reservation.customerNote ?? "",
      items,
    });
  };

  const submitFinancialAdjust = () => {
    if (!financialReservation) return;
    const items = financialForm.items
      .map(item => ({
        label: item.label.trim() || (
          item.itemType === "extension" ? "延長" :
            item.itemType === "discount" ? "割引" :
              item.itemType === "adjustment" ? "調整金" : "オプション"
        ),
        amount: Math.max(0, parseInt(item.amount, 10) || 0),
        itemType: item.itemType,
        backRate: item.backRate === "" ? undefined : Math.max(0, Math.min(100, parseFloat(item.backRate) || 0)),
      }))
      .filter(item => item.amount > 0);
    const optionTotal = items.length
      ? items.filter(item => item.itemType !== "discount").reduce((sum, item) => sum + item.amount, 0)
      : Math.max(0, parseInt(financialForm.optionTotal, 10) || 0);
    const discountAmount = items.length
      ? items.filter(item => item.itemType === "discount").reduce((sum, item) => sum + item.amount, 0)
      : Math.max(0, parseInt(financialForm.discountAmount, 10) || 0);
    adjustFinancials.mutate({
      id: financialReservation.id,
      optionTotal,
      discountAmount,
      note: financialForm.note,
      items,
    });
  };

  const updateFinancialItem = (index: number, patch: Partial<FinancialItemForm>) => {
    setFinancialForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === index ? { ...item, ...patch } : item),
    }));
  };

  const removeFinancialItem = (index: number) => {
    setFinancialForm(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  };

  const submitNormalCancel = () => {
    if (!cancelingReservation) return;
    const reason = cancelReason.trim() || "通常キャンセル";
    updateStatus.mutate(
      { id: cancelingReservation.id, status: "cancelled", cancelReason: reason, note: reason },
      {
        onSuccess: () => {
          setCancelingReservation(null);
          setCancelReason("");
        },
      },
    );
  };

  const selectedRoomIdFor = (reservation: any) => {
    const selected = selectedRoomByReservation[reservation.id];
    const current = selected ?? (reservation.roomId ? String(reservation.roomId) : "");
    return current ? Number(current) : undefined;
  };

  const canProgressReservation = (reservation: any) => Boolean(reservation.therapistId && selectedRoomIdFor(reservation));

  const progressBlockedReason = (reservation: any) => {
    if (!reservation.therapistId) return "担当セラピストを割り当ててください";
    if (!selectedRoomIdFor(reservation)) return "案内ルームを選択してください";
    return "";
  };

  return (
    <AromaLayout title="予約管理" showBack backHref="/store/dashboard" showNav navItems={navItems}>
      <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-border/50">
        <button
          onClick={() => setDate(subDays(date, 1))}
          disabled={statusFilter === "pending" || statusFilter === "all"}
          className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-30"
          aria-label="前日"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="font-semibold text-foreground">{heading}</div>
          <div className="text-xs text-muted-foreground">{list.length}件</div>
        </div>
        <button
          onClick={() => setDate(addDays(date, 1))}
          disabled={statusFilter === "pending" || statusFilter === "all"}
          className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-30"
          aria-label="翌日"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-3 bg-white border-b border-border/50">
        <Button
          type="button"
          onClick={openCreate}
          className="h-11 w-full rounded-xl gradient-luxury text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          新規予約を作成
        </Button>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          店舗作成の予約は、セラピストとルームを指定して確定予約として登録します。
        </p>
      </div>

      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              statusFilter === opt.value ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-2 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : list.map((r: any, i: number) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-luxury"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {r.date} {r.startTime} - {r.endTime}
                </div>
                <div className="text-xs text-muted-foreground">{r.menuName ?? "メニュー未設定"}</div>
              </div>
              <StatusBadge status={r.status} />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <AromaAvatar name={r.customerName} size="sm" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{r.customerName ?? "お客様"}</div>
                <div className="text-xs text-muted-foreground truncate">担当: {r.therapistName ?? "未定"}</div>
                {r.customerPhone && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-primary font-medium">{r.customerPhone}</span>
                    {r.customerPhoneVerified && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        SMS認証済み
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {r.notes && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mb-3 whitespace-pre-wrap">{r.notes}</div>
            )}

            <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-muted/30 p-2 text-xs">
              <div>
                <div className="text-muted-foreground">予約時コース</div>
                <div className="font-semibold text-foreground">¥{(r.menuPrice ?? 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">最終金額</div>
                <div className="font-semibold text-foreground">¥{(r.totalPrice ?? 0).toLocaleString()}</div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground">案内ルーム</div>
                <div className="font-semibold text-foreground">{r.roomName ?? "未設定"}</div>
              </div>
              {(r.optionTotal ?? 0) > 0 && <div className="text-muted-foreground">追加 ¥{(r.optionTotal ?? 0).toLocaleString()}</div>}
              {(r.discountAmount ?? 0) > 0 && <div className="text-muted-foreground">割引 -¥{(r.discountAmount ?? 0).toLocaleString()}</div>}
            </div>

            {!r.therapistId && !["completed", "cancelled", "no_show"].includes(r.status) && (
              <div className="mb-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
                {assigningReservationId === r.id ? (
                  <div className="space-y-2">
                    <Select value={selectedTherapistId} onValueChange={setSelectedTherapistId}>
                      <SelectTrigger className="h-9 rounded-lg bg-white text-xs">
                        <SelectValue placeholder="担当セラピストを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {therapistList.map((t: any) => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.displayName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-8 flex-1 rounded-lg bg-primary text-xs text-white hover:bg-primary/90"
                        disabled={!selectedTherapistId || assignTherapist.isPending}
                        onClick={() => assignTherapist.mutate({ id: r.id, therapistId: Number(selectedTherapistId) })}
                      >
                        割り当てる
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg text-xs"
                        onClick={() => {
                          setAssigningReservationId(null);
                          setSelectedTherapistId("");
                        }}
                      >
                        閉じる
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-full rounded-lg border-primary/30 text-xs font-semibold text-primary"
                    onClick={() => {
                      setAssigningReservationId(r.id);
                      setSelectedTherapistId("");
                    }}
                  >
                    担当を割り当て
                  </Button>
                )}
              </div>
            )}

            {!["completed", "cancelled", "no_show"].includes(r.status) && (
              <div className="mb-3 rounded-xl border border-border/60 bg-white p-3">
                <Label className="text-xs font-semibold text-foreground">案内ルーム</Label>
                <Select
                  value={selectedRoomByReservation[r.id] ?? (r.roomId ? String(r.roomId) : "")}
                  onValueChange={v => setSelectedRoomByReservation(prev => ({ ...prev, [r.id]: v }))}
                >
                  <SelectTrigger className="mt-2 h-9 rounded-lg bg-muted/30 text-xs">
                    <SelectValue placeholder="ルームを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {roomList.map((room: any) => (
                      <SelectItem key={room.id} value={String(room.id)}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {roomList.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => navigate("/store/rooms")}
                    className="mt-2 text-left text-[11px] font-semibold text-primary"
                  >
                    ルームが未登録です。ルーム管理で登録してください。
                  </button>
                ) : !selectedRoomIdFor(r) ? (
                  <p className="mt-2 text-[11px] text-amber-700">確定前にルームを選択してください。</p>
                ) : null}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              {!["completed", "cancelled", "no_show"].includes(r.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 rounded-lg border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => openEdit(r)}
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />編集
                </Button>
              )}
              {r.customerId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => navigate(`/messages?customerId=${r.customerId}&storeId=${session?.storeId}&type=store_customer`)}
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1" />顧客DM
                </Button>
              )}
              {!["cancelled", "no_show"].includes(r.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 rounded-lg border-teal-200 text-teal-700 hover:bg-teal-50"
                  onClick={() => openFinancialAdjust(r)}
                  disabled={adjustFinancials.isPending}
                >
                  <ReceiptText className="w-3.5 h-3.5 mr-1" />金額調整
                </Button>
              )}
              {r.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    className="text-xs h-8 rounded-lg bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => updateStatus.mutate({ id: r.id, status: "confirmed", roomId: selectedRoomIdFor(r) })}
                    disabled={updateStatus.isPending || !canProgressReservation(r)}
                    title={progressBlockedReason(r)}
                  >
                    確定
                  </Button>
                </>
              )}
              {r.status === "confirmed" && (
                <>
                  <Button
                    size="sm"
                    className="text-xs h-8 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => updateStatus.mutate({ id: r.id, status: "in_service", roomId: selectedRoomIdFor(r) })}
                    disabled={updateStatus.isPending || !canProgressReservation(r)}
                    title={progressBlockedReason(r)}
                  >
                    施術開始
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 rounded-lg text-orange-600 border-orange-200 hover:bg-orange-50"
                    onClick={() => updateStatus.mutate({ id: r.id, status: "no_show" })}
                    disabled={updateStatus.isPending}
                  >
                    無断キャンセル
                  </Button>
                </>
              )}
              {r.status === "in_service" && (
                <Button
                  size="sm"
                  className="text-xs h-8 rounded-lg gradient-luxury text-white"
                  onClick={() => updateStatus.mutate({ id: r.id, status: "completed", roomId: selectedRoomIdFor(r) })}
                  disabled={updateStatus.isPending || !canProgressReservation(r)}
                  title={progressBlockedReason(r)}
                >
                  施術完了
                </Button>
              )}
              {["pending", "confirmed"].includes(r.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    setCancelingReservation(r);
                    setCancelReason(r.cancelReason ?? "");
                  }}
                  disabled={updateStatus.isPending}
                >
                  通常キャンセル
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog open={creatingReservation} onOpenChange={setCreatingReservation}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[88dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>新規予約を作成</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl bg-primary/5 p-3 text-xs leading-relaxed text-primary">
              確定予約として登録します。出勤済みのセラピストと空きルームが必要です。
            </div>
            <div>
              <Label>顧客</Label>
              <Select
                value={createForm.customerMode === "new" ? "new" : createForm.customerId}
                onValueChange={v => setCreateForm(f => v === "new"
                  ? { ...f, customerMode: "new", customerId: "" }
                  : { ...f, customerMode: "existing", customerId: v, customerName: "", customerPhone: "" }
                )}
              >
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="顧客を選択" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">新規顧客を作成</SelectItem>
                  {customerList.map((c: any) => (
                    <SelectItem key={c.customerId} value={String(c.customerId)}>
                      {c.displayName ?? `顧客#${c.customerId}`} {c.phone ? ` / ${c.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createForm.customerMode === "new" && (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label>顧客名</Label>
                  <Input
                    value={createForm.customerName}
                    onChange={e => setCreateForm(f => ({ ...f, customerName: e.target.value }))}
                    className="mt-1 rounded-xl"
                    placeholder="例: 佐藤"
                  />
                </div>
                <div>
                  <Label>電話番号</Label>
                  <Input
                    value={createForm.customerPhone}
                    onChange={e => setCreateForm(f => ({ ...f, customerPhone: e.target.value }))}
                    className="mt-1 rounded-xl"
                    inputMode="tel"
                    placeholder="例: 09012345678"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>日付</Label>
                <Input
                  type="date"
                  value={createForm.date}
                  onChange={e => setCreateForm(f => ({ ...f, date: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label>開始時間</Label>
                <Input
                  type="time"
                  value={createForm.startTime}
                  onChange={e => setCreateForm(f => ({ ...f, startTime: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label>コース</Label>
              <Select value={createForm.menuId} onValueChange={v => setCreateForm(f => ({ ...f, menuId: v }))}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="コースを選択" /></SelectTrigger>
                <SelectContent>
                  {menuList.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} ({m.durationMinutes}分 / ¥{(m.price ?? 0).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>担当セラピスト</Label>
              <Select value={createForm.therapistId} onValueChange={v => setCreateForm(f => ({ ...f, therapistId: v }))}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="セラピストを選択" /></SelectTrigger>
                <SelectContent>
                  {therapistList.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>案内ルーム</Label>
              <Select value={createForm.roomId} onValueChange={v => setCreateForm(f => ({ ...f, roomId: v }))}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="ルームを選択" /></SelectTrigger>
                <SelectContent>
                  {roomList.map((room: any) => (
                    <SelectItem key={room.id} value={String(room.id)}>{room.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roomList.length === 0 && (
                <button
                  type="button"
                  onClick={() => navigate("/store/rooms")}
                  className="mt-2 text-left text-[11px] font-semibold text-primary"
                >
                  ルームが未登録です。ルーム管理で登録してください。
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={createForm.isNomination}
                onChange={e => setCreateForm(f => ({ ...f, isNomination: e.target.checked }))}
              />
              指名予約として扱う
            </label>
            <div>
              <Label>店舗メモ</Label>
              <Textarea
                value={createForm.note}
                onChange={e => setCreateForm(f => ({ ...f, note: e.target.value }))}
                className="mt-1 rounded-xl"
                rows={3}
                placeholder="例: 電話受付、到着時にコース確認"
              />
            </div>
            <Button
              className="h-11 w-full rounded-xl gradient-luxury text-white"
              onClick={submitCreate}
              disabled={createReservation.isPending}
            >
              確定予約を作成
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingReservation} onOpenChange={(open) => !open && setEditingReservation(null)}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[86dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>予約を編集</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>日付</Label>
              <Input
                type="date"
                value={editForm.date}
                onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label>開始時間</Label>
              <Input
                type="time"
                value={editForm.startTime}
                onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label>コース</Label>
              <Select value={editForm.menuId} onValueChange={v => setEditForm(f => ({ ...f, menuId: v }))}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="コースを選択" /></SelectTrigger>
                <SelectContent>
                  {menuList.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} ({m.durationMinutes}分 / ¥{(m.price ?? 0).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>担当セラピスト</Label>
              <Select
                value={editForm.therapistId}
                onValueChange={v => setEditForm(f => ({ ...f, therapistId: v, isNomination: v !== "none" }))}
              >
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="担当を選択" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">指名無し</SelectItem>
                  {therapistList.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-muted-foreground">担当ありの場合、出勤枠と重複予約を再チェックします。</p>
            </div>
            <label className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.isNomination}
                disabled={editForm.therapistId === "none"}
                onChange={e => setEditForm(f => ({ ...f, isNomination: e.target.checked }))}
              />
              指名予約として扱う
            </label>
            <div>
              <Label>店舗メモ</Label>
              <Textarea
                value={editForm.note}
                onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
                className="mt-1 rounded-xl"
                rows={3}
                placeholder="変更理由や店舗内メモ"
              />
            </div>
            <Button className="w-full h-11 rounded-xl gradient-luxury text-white" onClick={submitEdit} disabled={updateReservation.isPending}>
              変更を保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!financialReservation} onOpenChange={(open) => !open && setFinancialReservation(null)}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[86dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>現場オプション・金額調整</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>予約時コース</span><span>¥{(financialReservation?.menuPrice ?? 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>指名料</span><span>¥{(financialReservation?.nominationFee ?? 0).toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-border/50 pt-2 mt-2 text-foreground font-semibold">
                <span>現在の最終金額</span><span>¥{(financialReservation?.totalPrice ?? 0).toLocaleString()}</span>
              </div>
            </div>
            <div>
              <Label>オプション/追加料金 合計</Label>
              <Input
                type="number"
                min={0}
                value={financialForm.optionTotal}
                onChange={e => setFinancialForm(f => ({ ...f, optionTotal: e.target.value }))}
                className="mt-1 rounded-xl"
                placeholder="例: 3000"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">現場で追加したオプションや延長料金を合計で入力します。</p>
            </div>
            <div>
              <Label>割引金額</Label>
              <Input
                type="number"
                min={0}
                value={financialForm.discountAmount}
                onChange={e => setFinancialForm(f => ({ ...f, discountAmount: e.target.value }))}
                className="mt-1 rounded-xl"
                placeholder="例: 1000"
              />
            </div>
            <div className="rounded-2xl border border-border/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">明細</div>
                  <p className="text-[11px] text-muted-foreground">延長・オプション・割引ごとに残せます。バック率を空欄にすると基本バック率を使います。</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg text-xs"
                  onClick={() => setFinancialForm(f => ({ ...f, items: [...f.items, emptyFinancialItem()] }))}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />追加
                </Button>
              </div>
              <div className="space-y-2">
                {financialForm.items.length === 0 ? (
                  <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                    明細なし。上の合計金額だけで反映します。
                  </div>
                ) : financialForm.items.map((item, index) => (
                  <div key={index} className="rounded-xl bg-muted/30 p-2">
                    <div className="mb-2 grid grid-cols-[1fr_88px_34px] gap-2">
                      <Input
                        value={item.label}
                        onChange={e => updateFinancialItem(index, { label: e.target.value })}
                        className="h-9 rounded-lg bg-white text-xs"
                        placeholder="例: 延長30分"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={item.amount}
                        onChange={e => updateFinancialItem(index, { amount: e.target.value })}
                        className="h-9 rounded-lg bg-white text-xs"
                        placeholder="金額"
                      />
                      <button
                        type="button"
                        onClick={() => removeFinancialItem(index)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-red-500"
                        aria-label="明細を削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={item.itemType} onValueChange={v => updateFinancialItem(index, { itemType: v as FinancialItemForm["itemType"] })}>
                        <SelectTrigger className="h-9 rounded-lg bg-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="option">オプション</SelectItem>
                          <SelectItem value="extension">延長</SelectItem>
                          <SelectItem value="adjustment">調整金</SelectItem>
                          <SelectItem value="discount">割引</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.backRate}
                        onChange={e => updateFinancialItem(index, { backRate: e.target.value })}
                        className="h-9 rounded-lg bg-white text-xs"
                        placeholder="個別バック率%"
                        disabled={item.itemType === "discount"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>店舗メモ</Label>
              <Textarea
                value={financialForm.note}
                onChange={e => setFinancialForm(f => ({ ...f, note: e.target.value }))}
                className="mt-1 rounded-xl resize-none"
                rows={3}
                placeholder="例: 現場で延長30分、割引適用"
              />
            </div>
            <div className="rounded-2xl border border-border/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <History className="h-4 w-4 text-primary" />
                変更履歴
              </div>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {((financialHistory as any[]) ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">まだ履歴はありません。</p>
                ) : ((financialHistory as any[]) ?? []).map(event => (
                  <div key={event.id} className="rounded-xl bg-muted/30 p-2 text-xs">
                    <div className="flex justify-between font-semibold text-foreground">
                      <span>¥{Number(event.beforeTotal ?? 0).toLocaleString()} → ¥{Number(event.afterTotal ?? 0).toLocaleString()}</span>
                      <span>{new Date(event.createdAt).toLocaleDateString("ja-JP")}</span>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      追加 ¥{Number(event.optionAmount ?? 0).toLocaleString()} / 割引 ¥{Number(event.discountAmount ?? 0).toLocaleString()}
                    </div>
                    {event.items?.length > 0 && (
                      <div className="mt-1 space-y-0.5 text-muted-foreground">
                        {event.items.map((item: any, idx: number) => (
                          <div key={idx}>{item.label || item.itemType}: ¥{Number(item.amount ?? 0).toLocaleString()}{item.backRate !== undefined ? ` / ${item.backRate}%` : ""}</div>
                        ))}
                      </div>
                    )}
                    {event.note && <div className="mt-1 whitespace-pre-wrap text-muted-foreground">{event.note}</div>}
                  </div>
                ))}
              </div>
            </div>
            <Button className="w-full h-11 rounded-xl gradient-luxury text-white" onClick={submitFinancialAdjust} disabled={adjustFinancials.isPending}>
              売上・給与に反映する
            </Button>
            <p className="text-[11px] text-muted-foreground">完了済み予約の場合は、店舗売上・店舗給与管理・セラピスト売上確認へ即時反映されます。</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelingReservation} onOpenChange={(open) => !open && setCancelingReservation(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>通常キャンセル</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              無断キャンセルとは別に、理由を残して通常キャンセルにします。売上/給与には入りません。
            </p>
            <div>
              <Label>理由メモ</Label>
              <Textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="mt-1 rounded-xl"
                rows={3}
                placeholder="例: 顧客都合、店舗都合、日程変更のため"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-10 rounded-xl" onClick={() => setCancelingReservation(null)}>
                戻る
              </Button>
              <Button className="h-10 rounded-xl bg-red-600 text-white hover:bg-red-700" onClick={submitNormalCancel} disabled={updateStatus.isPending}>
                通常キャンセル
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AromaLayout>
  );
}
