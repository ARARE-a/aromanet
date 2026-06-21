import { useState } from "react";
import { Link } from "wouter";
import { Mail, Lock, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getAuthErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CustomerRegister() {
  const [email, setEmail] = useState("");
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
    if (!email || !displayName || !password || !confirmPassword) {
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
    regMut.mutate({ displayName: displayName.trim(), email: email.trim().toLowerCase(), password, ageConfirmed: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-widest text-primary">AromaNet</h1>
          <p className="text-sm text-muted-foreground mt-1">お客様新規登録</p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-base mb-1">アカウント情報を入力</h2>
            <p className="text-xs text-muted-foreground">メールアドレスとパスワードで登録できます</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">ニックネーム</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="ニックネーム"
                  className="pl-9"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
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
                  placeholder="customer@example.com"
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
            disabled={!email || !displayName || !password || !confirmPassword || regMut.isPending}
            onClick={handleSubmit}
          >
            {regMut.isPending ? "登録中..." : "登録する（18歳以上）"}
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
