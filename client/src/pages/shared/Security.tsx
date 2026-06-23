import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, Key, AlertTriangle, Eye, EyeOff, Lock, ChevronRight } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SecurityPage() {
  const [, navigate] = useLocation();
  const { session } = useSession();

  // Password change state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Crash password state
  const [crashPw, setCrashPw] = useState("");
  const [confirmCrashPw, setConfirmCrashPw] = useState("");
  const [showCrashPw, setShowCrashPw] = useState(false);
  const [crashConfirmed, setCrashConfirmed] = useState(false);

  const changePwMut = trpc.aroAuth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("パスワードを変更しました");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const setCrashMut = trpc.aroAuth.setCrashPassword.useMutation({
    onSuccess: () => {
      toast.success("緊急保護パスワードを設定しました");
      setCrashPw(""); setConfirmCrashPw(""); setCrashConfirmed(false);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleChangePassword = () => {
    if (!currentPw || !newPw || !confirmPw) { toast.error("すべての項目を入力してください"); return; }
    if (newPw.length < 8) { toast.error("新しいパスワードは8文字以上で入力してください"); return; }
    if (newPw !== confirmPw) { toast.error("新しいパスワードが一致しません"); return; }
    changePwMut.mutate({ currentPassword: currentPw, newPassword: newPw });
  };

  const handleSetCrashPassword = () => {
    if (!crashPw || !confirmCrashPw) { toast.error("緊急保護パスワードを入力してください"); return; }
    if (crashPw.length < 8) { toast.error("緊急保護パスワードは8文字以上で入力してください"); return; }
    if (crashPw !== confirmCrashPw) { toast.error("緊急保護パスワードが一致しません"); return; }
    if (!crashConfirmed) { toast.error("注意事項を確認してチェックを入れてください"); return; }
    setCrashMut.mutate({ crashPassword: crashPw });
  };

  const backHref = session?.role === "therapist" ? "/therapist/profile"
    : session?.role === "store" ? "/store/profile"
    : "/my/edit";

  return (
    <AromaLayout title="セキュリティ設定" showBack backHref={backHref}>
      <div className="px-4 py-6 space-y-6 pb-24">

        {/* Password change */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-luxury p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Key className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">パスワード変更</h3>
              <p className="text-xs text-muted-foreground">現在のパスワードを変更します</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">現在のパスワード</Label>
              <div className="relative">
                <Input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="現在のパスワード"
                  className="rounded-xl h-11 pr-10"
                />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">新しいパスワード（8文字以上）</Label>
              <div className="relative">
                <Input
                  type={showNewPw ? "text" : "password"}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="新しいパスワード"
                  className="rounded-xl h-11 pr-10"
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">新しいパスワード（確認）</Label>
              <Input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="新しいパスワードを再入力"
                className="rounded-xl h-11"
              />
            </div>
          </div>

          <Button
            className="w-full h-11 rounded-xl gradient-luxury text-white font-semibold"
            onClick={handleChangePassword}
            disabled={changePwMut.isPending}
          >
            <Lock className="w-4 h-4 mr-2" />
            {changePwMut.isPending ? "変更中..." : "パスワードを変更する"}
          </Button>
        </motion.div>

        {/* Emergency protection password */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-luxury p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">緊急保護パスワード設定</h3>
              <p className="text-xs text-muted-foreground">通常パスワードとは別に管理する緊急削除用パスワード</p>
            </div>
          </div>

          {/* Warning box */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-700">重要な注意事項</p>
            </div>
            <p className="text-xs text-red-600 leading-relaxed">
              緊急保護パスワードでログインすると、アカウント・予約・メッセージ・投稿などのデータ削除処理が実行されます。この操作は<strong>取り消せません</strong>。通常パスワードとは別に管理し、アカウント保護が必要な場合のみ使用してください。
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">緊急保護パスワード（8文字以上）</Label>
              <div className="relative">
                <Input
                  type={showCrashPw ? "text" : "password"}
                  value={crashPw}
                  onChange={e => setCrashPw(e.target.value)}
                  placeholder="通常パスワードとは別のパスワード"
                  className="rounded-xl h-11 pr-10"
                />
                <button type="button" onClick={() => setShowCrashPw(!showCrashPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showCrashPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">緊急保護パスワード（確認）</Label>
              <Input
                type="password"
                value={confirmCrashPw}
                onChange={e => setConfirmCrashPw(e.target.value)}
                placeholder="緊急保護パスワードを再入力"
                className="rounded-xl h-11"
              />
            </div>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={crashConfirmed}
              onChange={e => setCrashConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-red-500"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              上記の注意事項を理解し、緊急保護パスワードを設定することに同意します
            </span>
          </label>

          <Button
            variant="outline"
            className="w-full h-11 rounded-xl border-red-300 text-red-600 font-semibold hover:bg-red-50"
            onClick={handleSetCrashPassword}
            disabled={setCrashMut.isPending || !crashConfirmed}
          >
            <Shield className="w-4 h-4 mr-2" />
            {setCrashMut.isPending ? "設定中..." : "緊急保護パスワードを設定する"}
          </Button>
        </motion.div>

        {/* How emergency protection works */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gray-50 rounded-2xl p-4 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">緊急保護機能の使い方</h4>
          {[
            "ログイン画面でメールアドレスを入力する",
            "パスワード欄に通常パスワードの代わりに「緊急保護パスワード」を入力する",
            "ログインボタンを押すと、対象データの削除処理が実行される",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-red-600">{i + 1}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{step}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </AromaLayout>
  );
}
