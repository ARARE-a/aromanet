import { useState } from "react";
import { Link } from "wouter";
import { Mail, Lock, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getAuthErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LegalLinks } from "@/components/LegalLinks";

export default function StoreRegister() {
  const [email, setEmail] = useState("");
  const [storeName, setStoreName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const regMut = trpc.aroAuth.storeRegister.useMutation({
    onSuccess: () => { window.location.href = "/store/dashboard"; },
    onError: (e) => setError(getAuthErrorMessage(e)),
  });

  const handleSubmit = () => {
    setError(null);
    if (!email || !storeName || !password || !confirmPassword) {
      setError("すべての項目を入力してください");
      return;
    }
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }
    regMut.mutate({ storeName: storeName.trim(), email: email.trim(), password });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-widest text-primary">AromaNet</h1>
          <p className="text-sm text-muted-foreground mt-1">店舗新規登録</p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-base mb-1">店舗情報を入力</h2>
            <p className="text-xs text-muted-foreground">メールアドレスとパスワードで登録できます</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="storeName">店舗名</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="storeName"
                  type="text"
                  placeholder="サロン名"
                  className="pl-9"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">メールアドレス</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="store@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">パスワード（8文字以上）</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="8文字以上"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">パスワード確認</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>
            </div>
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <Button
            className="w-full"
            disabled={!email || !storeName || !password || !confirmPassword || regMut.isPending}
            onClick={handleSubmit}
          >
            {regMut.isPending ? "登録中..." : "登録する"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/store/login" className="text-primary font-medium hover:underline">ログイン</Link>
        </p>
        <LegalLinks className="mt-4" />
      </div>
    </div>
  );
}
