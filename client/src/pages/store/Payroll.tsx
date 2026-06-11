import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { FileText, ChevronLeft, ChevronRight, CheckCircle, Settings, Send, ChevronDown, ChevronUp } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, subMonths, addMonths } from "date-fns";
import { ja } from "date-fns/locale";

export default function StorePayroll() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [month, setMonth] = useState(new Date());
  const [selectedTherapist, setSelectedTherapist] = useState<any>(null);
  const [showSalarySettings, setShowSalarySettings] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [salaryForm, setSalaryForm] = useState({ backRate: "60", nominationFee: "2000", adjustmentNote: "" });
  const [notifyForm, setNotifyForm] = useState({ therapistId: 0, message: "", amount: "" });
  const utils = trpc.useUtils();

  useEffect(() => { if (!isLoading && (!session || session.role !== "store")) navigate("/store/login"); }, [session, isLoading]);

  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;
  const { data: payrolls, refetch } = trpc.sales.getTherapistPayrolls.useQuery({ year, month: monthNum }, { enabled: !!session });
  const list = (payrolls as any[]) ?? [];

  const { data: therapists } = trpc.store.getTherapists.useQuery(undefined, { enabled: !!session });
  const therapistList = (therapists as any[]) ?? [];

  // Salary settings are fetched per-therapist; we'll store them in a local map
  const [settingsMap] = useState<Map<number, any>>(new Map());

  const updateMut = trpc.sales.updatePayroll.useMutation({
    onSuccess: () => { toast.success("支払いステータスを更新しました"); refetch(); },
    onError: e => toast.error(e.message),
  });

  const updateSalaryMut = trpc.affiliation.updateSalarySettings.useMutation({
    onSuccess: () => {
      utils.affiliation.getSalarySettings.invalidate();
      toast.success("給与設定を更新しました");
      setShowSalarySettings(false);
    },
    onError: e => toast.error(e.message),
  });

  const sendNotifyMut = trpc.affiliation.sendSalaryNotification.useMutation({
    onSuccess: () => {
      toast.success("女子給を送信しました");
      setShowNotify(false);
      setNotifyForm({ therapistId: 0, message: "", amount: "" });
    },
    onError: e => toast.error(e.message),
  });

  const openSalarySettings = (therapist: any) => {
    setSelectedTherapist(therapist);
    setSalaryForm({
      backRate: "60",
      nominationFee: "2000",
      adjustmentNote: "",
    });
    setShowSalarySettings(true);
  };

  return (
    <AromaLayout title="給与管理" showBack backHref="/store/dashboard">
      {/* Month selector */}
      <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-border/20">
        <button onClick={() => setMonth(subMonths(month, 1))} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-foreground">{format(month, "yyyy年M月", { locale: ja })}</span>
        <button onClick={() => setMonth(addMonths(month, 1))} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-4 py-3 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 h-9 rounded-xl" onClick={() => setShowNotify(true)}>
          <Send className="w-3.5 h-3.5 mr-1" />女子給を送信
        </Button>
      </div>

      <div className="px-4 space-y-3 pb-24">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">給与データがありません</p>
            <p className="text-xs mt-1">予約が完了すると自動で集計されます</p>
          </div>
        ) : (
          list.map((p: any, i: number) => {
            const isExpanded = expandedId === p.id;
            const therapist = therapistList.find(t => t.id === p.therapistId);
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl shadow-luxury overflow-hidden">
                <button className="w-full p-4 flex items-center gap-3 text-left" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                  <AromaAvatar name={p.therapistName} size="md" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{p.therapistName}</div>
                    <div className="text-xs text-muted-foreground">指名{p.nominationCount ?? 0}本 · バック率{p.backRate ?? 0}%</div>
                  </div>
                  <div className="text-right mr-2">
                    <div className="font-bold text-foreground">¥{(p.totalAmount ?? 0).toLocaleString()}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {p.paymentStatus === "paid" ? "支払済" : "未払い"}
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    className="border-t border-border/30 px-4 pb-4">
                    <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
                      <div className="bg-muted/30 rounded-xl p-2 text-center">
                        <div className="text-xs text-muted-foreground">売上</div>
                        <div className="font-bold text-sm">¥{(p.salesAmount ?? 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-2 text-center">
                        <div className="text-xs text-muted-foreground">女子給</div>
                        <div className="font-bold text-sm">¥{(p.totalAmount ?? 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-2 text-center">
                        <div className="text-xs text-muted-foreground">調整</div>
                        <div className={`font-bold text-sm ${(p.adjustmentAmount ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {(p.adjustmentAmount ?? 0) >= 0 ? "+" : ""}¥{(p.adjustmentAmount ?? 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {therapist && (
                        <Button size="sm" variant="outline" className="flex-1 h-9 rounded-xl" onClick={() => openSalarySettings(therapist)}>
                          <Settings className="w-3.5 h-3.5 mr-1" />給与設定
                        </Button>
                      )}
                      {p.paymentStatus !== "paid" && (
                        <Button size="sm" className="flex-1 h-9 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => updateMut.mutate({ id: p.id, isPaid: true })}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />支払い済み
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Salary Settings Dialog */}
      <Dialog open={showSalarySettings} onOpenChange={setShowSalarySettings}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              {selectedTherapist?.displayName} の給与設定
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>バック率 (%)</Label>
              <Input type="number" value={salaryForm.backRate} onChange={e => setSalaryForm(f => ({ ...f, backRate: e.target.value }))} className="mt-1 rounded-xl" min={0} max={100} placeholder="例: 60" />
              <p className="text-xs text-muted-foreground mt-1">売上に対するセラピストへの還元率</p>
            </div>
            <div>
              <Label>指名料 (円)</Label>
              <Input type="number" value={salaryForm.nominationFee} onChange={e => setSalaryForm(f => ({ ...f, nominationFee: e.target.value }))} className="mt-1 rounded-xl" min={0} placeholder="例: 2000" />
            </div>
            <div>
              <Label>調整メモ</Label>
              <Textarea value={salaryForm.adjustmentNote} onChange={e => setSalaryForm(f => ({ ...f, adjustmentNote: e.target.value }))} className="mt-1 rounded-xl resize-none" rows={2} placeholder="調整内容のメモ..." />
            </div>
            <Button className="w-full h-11 rounded-xl gradient-luxury text-white font-semibold"
              onClick={() => updateSalaryMut.mutate({
                therapistId: selectedTherapist.id,
                backRate: parseFloat(salaryForm.backRate) || 60,
                nominationFee: parseInt(salaryForm.nominationFee) || 0,
                adjustmentNote: salaryForm.adjustmentNote,
              })}
              disabled={updateSalaryMut.isPending}>
              更新する
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Salary Notification Dialog */}
      <Dialog open={showNotify} onOpenChange={setShowNotify}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />女子給を送信
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>送信先セラピスト</Label>
              <Select value={notifyForm.therapistId ? String(notifyForm.therapistId) : ""} onValueChange={v => setNotifyForm(f => ({ ...f, therapistId: parseInt(v) }))}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="セラピストを選択" /></SelectTrigger>
                <SelectContent>
                  {therapistList.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>本日の女子給 (円)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
                <Input type="number" value={notifyForm.amount} onChange={e => setNotifyForm(f => ({ ...f, amount: e.target.value }))} className="pl-7 rounded-xl" placeholder="例: 15000" />
              </div>
            </div>
            <div>
              <Label>メッセージ</Label>
              <Textarea value={notifyForm.message} onChange={e => setNotifyForm(f => ({ ...f, message: e.target.value }))} className="mt-1 rounded-xl resize-none" rows={3} placeholder="お疲れ様でした！本日の女子給をお知らせします。" />
            </div>
            <Button className="w-full h-11 rounded-xl gradient-luxury text-white font-semibold"
              onClick={() => sendNotifyMut.mutate({
                therapistId: notifyForm.therapistId,
                amount: parseInt(notifyForm.amount) || 0,
                message: notifyForm.message,
              })}
              disabled={sendNotifyMut.isPending || !notifyForm.therapistId || !notifyForm.amount}>
              {sendNotifyMut.isPending ? "送信中..." : "送信する"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AromaLayout>
  );
}
