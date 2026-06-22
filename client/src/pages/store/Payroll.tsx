import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  RefreshCw,
  Send,
  Settings,
} from "lucide-react";
import { addMonths, format, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { AromaAvatar, AromaLayout } from "@/components/AromaLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

const yen = (value: number | null | undefined) => `¥${Number(value ?? 0).toLocaleString()}`;

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

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "store")) navigate("/store/login");
  }, [session, isLoading, navigate]);

  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;
  const { data: payrolls, refetch } = trpc.sales.getTherapistPayrolls.useQuery(
    { year, month: monthNum },
    { enabled: !!session, refetchOnWindowFocus: true },
  );
  const { data: therapists } = trpc.store.getTherapists.useQuery(undefined, { enabled: !!session });
  const list = (payrolls as any[]) ?? [];
  const therapistList = (therapists as any[]) ?? [];

  const updateMut = trpc.sales.updatePayroll.useMutation({
    onSuccess: () => {
      toast.success("支払いステータスを更新しました");
      refetch();
    },
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
      toast.success("女子給を通知しました");
      utils.sales.getTherapistPayrolls.invalidate({ year, month: monthNum });
      refetch();
      setShowNotify(false);
      setNotifyForm({ therapistId: 0, message: "", amount: "" });
    },
    onError: e => toast.error(e.message),
  });

  const calculatePayrollMut = trpc.sales.calculatePayroll.useMutation({
    onSuccess: () => {
      toast.success("給与を再計算しました");
      utils.sales.getTherapistPayrolls.invalidate({ year, month: monthNum });
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const openSalarySettings = (therapist: any, payroll?: any) => {
    setSelectedTherapist(therapist);
    setSalaryForm({
      backRate: String(payroll?.backRate ?? therapist?.backRate ?? 60),
      nominationFee: String(payroll?.nominationFee ?? therapist?.nominationFee ?? 2000),
      adjustmentNote: payroll?.adjustmentNote ?? "",
    });
    setShowSalarySettings(true);
  };

  return (
    <AromaLayout title="給与管理" showBack backHref="/store/dashboard">
      <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-border/20">
        <button onClick={() => setMonth(subMonths(month, 1))} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="前月">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-foreground">{format(month, "yyyy年M月", { locale: ja })}</span>
        <button onClick={() => setMonth(addMonths(month, 1))} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="翌月">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-3 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-9 rounded-xl"
          onClick={() => calculatePayrollMut.mutate({ year, month: monthNum })}
          disabled={calculatePayrollMut.isPending}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${calculatePayrollMut.isPending ? "animate-spin" : ""}`} />
          給与を再計算
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-9 rounded-xl" onClick={() => setShowNotify(true)}>
          <Send className="w-3.5 h-3.5 mr-1" />
          女子給を通知
        </Button>
      </div>

      <div className="px-4 space-y-3 pb-24">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">給与データはまだありません</p>
            <p className="text-xs mt-1">予約が完了すると自動で集計されます</p>
          </div>
        ) : list.map((payroll: any, i: number) => {
          const isExpanded = expandedId === payroll.id;
          const therapist = therapistList.find(t => t.id === payroll.therapistId) ?? {
            id: payroll.therapistId,
            displayName: payroll.therapistName,
            profileImageUrl: payroll.therapistImage,
          };
          const paid = payroll.paymentStatus === "paid" || payroll.isPaid;
          const totalAmount = payroll.totalAmount ?? payroll.totalPayroll ?? 0;
          const salesAmount = payroll.salesAmount ?? payroll.totalSales ?? 0;
          const adjustmentAmount = payroll.adjustmentAmount ?? 0;

          return (
            <motion.div
              key={payroll.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl shadow-luxury overflow-hidden"
            >
              <button
                className="w-full p-4 flex items-center gap-3 text-left"
                type="button"
                aria-expanded={isExpanded}
                aria-label={`${payroll.therapistName ?? therapist?.displayName ?? "セラピスト"}の給与明細を${isExpanded ? "閉じる" : "開く"}`}
                onClick={() => setExpandedId(isExpanded ? null : payroll.id)}
              >
                <AromaAvatar name={payroll.therapistName} src={payroll.therapistImage ?? therapist?.profileImageUrl} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{payroll.therapistName ?? therapist?.displayName ?? "セラピスト"}</div>
                  <div className="text-xs text-muted-foreground">
                    指名{payroll.nominationCount ?? 0}本 ・ バック率{payroll.backRate ?? 0}%
                  </div>
                </div>
                <div className="text-right mr-2">
                  <div className="font-bold text-foreground">{yen(totalAmount)}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {paid ? "支払い済み" : "未払い"}
                  </span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border/30 px-4 pb-4">
                  <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
                    <div className="bg-muted/30 rounded-xl p-2 text-center">
                      <div className="text-xs text-muted-foreground">売上</div>
                      <div className="font-bold text-sm">{yen(salesAmount)}</div>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-2 text-center">
                      <div className="text-xs text-muted-foreground">女子給</div>
                      <div className="font-bold text-sm">{yen(totalAmount)}</div>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-2 text-center">
                      <div className="text-xs text-muted-foreground">調整</div>
                      <div className={`font-bold text-sm ${adjustmentAmount >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {adjustmentAmount >= 0 ? "+" : ""}{yen(adjustmentAmount)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-9 rounded-xl" onClick={() => openSalarySettings(therapist, payroll)}>
                      <Settings className="w-3.5 h-3.5 mr-1" />
                      給与設定
                    </Button>
                    {!paid && (
                      <Button
                        size="sm"
                        className="flex-1 h-9 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => updateMut.mutate({ id: payroll.id, isPaid: true })}
                        disabled={updateMut.isPending}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        支払い済みにする
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      <Dialog open={showSalarySettings} onOpenChange={setShowSalarySettings}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              {selectedTherapist?.displayName ?? "セラピスト"} の給与設定
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>バック率(%)</Label>
              <Input
                type="number"
                value={salaryForm.backRate}
                onChange={e => setSalaryForm(f => ({ ...f, backRate: e.target.value }))}
                className="mt-1 rounded-xl"
                min={0}
                max={100}
                placeholder="例: 60"
              />
              <p className="text-xs text-muted-foreground mt-1">売上に対するセラピストへの還元率です</p>
            </div>
            <div>
              <Label>指名料(円)</Label>
              <Input
                type="number"
                value={salaryForm.nominationFee}
                onChange={e => setSalaryForm(f => ({ ...f, nominationFee: e.target.value }))}
                className="mt-1 rounded-xl"
                min={0}
                placeholder="例: 2000"
              />
            </div>
            <div>
              <Label>調整メモ</Label>
              <Textarea
                value={salaryForm.adjustmentNote}
                onChange={e => setSalaryForm(f => ({ ...f, adjustmentNote: e.target.value }))}
                className="mt-1 rounded-xl resize-none"
                rows={2}
                placeholder="調整内容のメモ"
              />
            </div>
            <Button
              className="w-full h-11 rounded-xl gradient-luxury text-white font-semibold"
              onClick={() => updateSalaryMut.mutate({
                therapistId: selectedTherapist.id,
                backRate: parseFloat(salaryForm.backRate) || 60,
                nominationFee: parseInt(salaryForm.nominationFee, 10) || 0,
                adjustmentNote: salaryForm.adjustmentNote,
              })}
              disabled={updateSalaryMut.isPending || !selectedTherapist?.id}
            >
              更新する
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNotify} onOpenChange={setShowNotify}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              女子給を通知
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>送信先セラピスト</Label>
              <Select
                value={notifyForm.therapistId ? String(notifyForm.therapistId) : ""}
                onValueChange={v => setNotifyForm(f => ({ ...f, therapistId: parseInt(v, 10) }))}
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="セラピストを選択" />
                </SelectTrigger>
                <SelectContent>
                  {therapistList.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>本日の女子給(円)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
                <Input
                  type="number"
                  value={notifyForm.amount}
                  onChange={e => setNotifyForm(f => ({ ...f, amount: e.target.value }))}
                  className="pl-7 rounded-xl"
                  placeholder="例: 15000"
                />
              </div>
            </div>
            <div>
              <Label>メッセージ</Label>
              <Textarea
                value={notifyForm.message}
                onChange={e => setNotifyForm(f => ({ ...f, message: e.target.value }))}
                className="mt-1 rounded-xl resize-none"
                rows={3}
                placeholder="本日の女子給をお知らせします"
              />
            </div>
            <Button
              className="w-full h-11 rounded-xl gradient-luxury text-white font-semibold"
              onClick={() => sendNotifyMut.mutate({
                therapistId: notifyForm.therapistId,
                amount: parseInt(notifyForm.amount, 10) || 0,
                message: notifyForm.message,
              })}
              disabled={sendNotifyMut.isPending || !notifyForm.therapistId || !notifyForm.amount}
            >
              {sendNotifyMut.isPending ? "送信中..." : "送信する"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AromaLayout>
  );
}
