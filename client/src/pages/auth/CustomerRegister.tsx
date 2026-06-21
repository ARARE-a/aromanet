import { useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "wouter";
import { Lock, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AromaLogo } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { getAuthErrorMessage } from "@/lib/errors";

export default function CustomerRegister() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const regMut = trpc.aroAuth.customerRegister.useMutation({
    onSuccess: () => { window.location.href = "/home"; },
    onError: (e) => setError(getAuthErrorMessage(e)),
  });

  const handleSubmit = () => {
    setError(null);
    if (!phoneNumber || !displayName || !password || !confirmPassword) {
      setError("すべての項目を入力してください。");
      return;
    }
    if (password !== confirmPassword) {
      setError("パスワードが一致しません。");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }
    regMut.mutate({
      displayName: displayName.trim(),
      phoneNumber: phoneNumber.trim(),
      password,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <AromaLogo size="md" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-foreground">お客様新規登録</h1>
          <p className="text-sm text-muted-foreground mt-1">登録後、そのままホーム画面に進みます</p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-base mb-1">アカウント情報</h2>
            <p className="text-xs text-muted-foreground">店舗が予約管理しやすいよう、電話番号で登録します。</p>
          </div>

          <div className="space-y-3">
            <Field label="ニックネーム" icon={<User className="w-4 h-4" />} value={displayName} onChange={setDisplayName} placeholder="例: 佐藤" />
            <Field label="電話番号" type="tel" inputMode="tel" icon={<Phone className="w-4 h-4" />} value={phoneNumber} onChange={setPhoneNumber} placeholder="09012345678" />
            <Field label="パスワード（8文字以上）" type="password" icon={<Lock className="w-4 h-4" />} value={password} onChange={setPassword} placeholder="8文字以上" />
            <Field
              label="パスワード確認"
              type="password"
              icon={<Lock className="w-4 h-4" />}
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="もう一度入力"
              onEnter={handleSubmit}
            />
          </div>

          {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-destructive text-xs">{error}</p>}

          <Button
            className="w-full"
            disabled={!phoneNumber || !displayName || !password || !confirmPassword || regMut.isPending}
            onClick={handleSubmit}
          >
            {regMut.isPending ? "登録中..." : "登録してホームへ"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/customer/login" className="text-primary font-medium hover:underline">ログイン</Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  type = "text",
  icon,
  value,
  onChange,
  placeholder,
  onEnter,
  inputMode,
}: {
  label: string;
  type?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onEnter?: () => void;
}) {
  const id = label;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
        <Input
          id={id}
          type={type}
          inputMode={inputMode}
          placeholder={placeholder}
          className="pl-9"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        />
      </div>
    </div>
  );
}
