import { useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, Building2, Lock, Mail, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getAuthErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LegalLinks } from "@/components/LegalLinks";

export default function TherapistRegister() {
  const inviteToken = new URLSearchParams(window.location.search).get("invite")?.trim() ?? "";
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const inviteQuery = trpc.affiliation.getInviteByToken.useQuery(
    { token: inviteToken },
    { enabled: inviteToken.length > 0, retry: false },
  );
  const invite = inviteQuery.data as any;
  const inviteValid = invite?.valid === true;

  const regMut = trpc.aroAuth.therapistRegister.useMutation({
    onSuccess: () => {
      window.location.href = "/therapist/dashboard";
    },
    onError: (e) => setError(getAuthErrorMessage(e)),
  });

  const handleSubmit = () => {
    setError(null);
    if (!inviteValid) {
      setError("有効な招待URLから登録してください");
      return;
    }
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
    regMut.mutate({
      displayName: displayName.trim(),
      email: email.trim(),
      password,
      inviteToken,
    });
  };

  const inviteError = !inviteToken
    ? "セラピスト登録には店舗から発行された招待URLが必要です。"
    : invite?.valid === false
      ? "この招待URLは無効、期限切れ、または利用上限に達しています。"
      : null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-widest text-primary">AromaNet</h1>
          <p className="text-sm text-muted-foreground mt-1">セラピスト招待登録</p>
        </div>

        {inviteError ? (
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="font-semibold text-base">招待URLが必要です</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {inviteError}
                <br />
                所属店舗に招待URLの発行を依頼してください。
              </p>
            </div>
            <Button variant="outline" className="w-full rounded-xl" asChild>
              <Link href="/therapist/login">ログイン画面に戻る</Link>
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-base mb-1">アカウント情報を入力</h2>
              <p className="text-xs text-muted-foreground">招待元の店舗に自動で所属登録されます</p>
            </div>

            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white text-primary flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  {inviteQuery.isLoading ? "招待情報を確認中..." : invite?.storeName ?? "招待店舗"}
                </div>
                <div className="text-xs text-muted-foreground truncate">{invite?.storeArea ?? "登録後、この店舗に所属します"}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="displayName">源氏名（表示名）</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="源氏名"
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
                    placeholder="therapist@example.com"
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
              disabled={!inviteValid || !email || !displayName || !password || !confirmPassword || regMut.isPending}
              onClick={handleSubmit}
            >
              {regMut.isPending ? "登録中..." : "登録する"}
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/therapist/login" className="text-primary font-medium hover:underline">ログイン</Link>
        </p>
        <LegalLinks className="mt-4" />
      </div>
    </div>
  );
}
