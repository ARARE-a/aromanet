import { useState } from "react";
import { Link } from "wouter";
import { Mail, Lock, User, KeyRound, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "email" | "verify" | "register";

export default function CustomerRegister() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const sendCodeMut = trpc.aroAuth.sendVerificationCode.useMutation({
    onSuccess: () => {
      setStep("verify");
      setError(null);
      startCooldown();
    },
    onError: (e) => setError(e.message),
  });

  const checkCodeMut = trpc.aroAuth.checkVerificationCode.useMutation({
    onSuccess: () => { setStep("register"); setError(null); },
    onError: (e) => setError(e.message),
  });

  const regMut = trpc.aroAuth.customerRegister.useMutation({
    onSuccess: () => { window.location.href = "/home"; },
    onError: (e) => setError(e.message),
  });

  function startCooldown() {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) { clearInterval(timer); return 0; }
        return v - 1;
      });
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-widest text-primary">AromaNet</h1>
          <p className="text-sm text-muted-foreground mt-1">お客様新規登録</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(["email", "verify", "register"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? "bg-primary text-primary-foreground" :
                (["email", "verify", "register"].indexOf(step) > i) ? "bg-primary/30 text-primary" :
                "bg-muted text-muted-foreground"
              }`}>{i + 1}</div>
              {i < 2 && <div className={`w-8 h-0.5 ${(["email", "verify", "register"].indexOf(step) > i) ? "bg-primary/50" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-4">
          {/* Step 1: Email */}
          {step === "email" && (
            <>
              <div>
                <h2 className="font-semibold text-base mb-1">メールアドレスを入力</h2>
                <p className="text-xs text-muted-foreground">確認コードを送信します</p>
              </div>
              <div className="space-y-2">
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
                    onKeyDown={(e) => e.key === "Enter" && sendCodeMut.mutate({ email, role: "customer" })}
                  />
                </div>
              </div>
              {error && <p className="text-destructive text-xs">{error}</p>}
              <Button
                className="w-full"
                disabled={!email || sendCodeMut.isPending}
                onClick={() => { setError(null); sendCodeMut.mutate({ email, role: "customer" }); }}
              >
                {sendCodeMut.isPending ? "送信中..." : "確認コードを送信"}
              </Button>
            </>
          )}

          {/* Step 2: Verify code */}
          {step === "verify" && (
            <>
              <div>
                <h2 className="font-semibold text-base mb-1">認証コードを入力</h2>
                <p className="text-xs text-muted-foreground">{email} に送信した6桁のコードを入力してください</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">認証コード</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    className="pl-9 text-center tracking-widest text-lg font-mono"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && code.length === 6 && checkCodeMut.mutate({ email, code, role: "customer" })}
                  />
                </div>
              </div>
              {error && <p className="text-destructive text-xs">{error}</p>}
              <Button
                className="w-full"
                disabled={code.length !== 6 || checkCodeMut.isPending}
                onClick={() => { setError(null); checkCodeMut.mutate({ email, code, role: "customer" }); }}
              >
                {checkCodeMut.isPending ? "確認中..." : "コードを確認"}
              </Button>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                disabled={resendCooldown > 0 || sendCodeMut.isPending}
                onClick={() => { setError(null); sendCodeMut.mutate({ email, role: "customer" }); }}
              >
                <RefreshCw className="w-3 h-3" />
                {resendCooldown > 0 ? `再送信 (${resendCooldown}秒後)` : "コードを再送信"}
              </button>
            </>
          )}

          {/* Step 3: Register info */}
          {step === "register" && (
            <>
              <div>
                <h2 className="font-semibold text-base mb-1">アカウント情報を入力</h2>
                <p className="text-xs text-muted-foreground">メール認証が完了しました</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">ニックネーム</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="displayName" type="text" placeholder="ニックネーム" className="pl-9" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">パスワード（8文字以上）</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="8文字以上" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">パスワード確認</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="confirmPassword" type="password" placeholder="••••••••" className="pl-9" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
              </div>
              {error && <p className="text-destructive text-xs">{error}</p>}
              <Button
                className="w-full"
                disabled={!displayName || !password || !confirmPassword || regMut.isPending}
                onClick={() => {
                  setError(null);
                  if (password !== confirmPassword) { setError("パスワードが一致しません"); return; }
                  regMut.mutateAsync({ displayName, email, password, ageConfirmed: true, verificationCode: code });
                }}
              >
                {regMut.isPending ? "登録中..." : "登録する（18歳以上）"}
              </Button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/customer/login" className="text-primary font-medium hover:underline">ログイン</Link>
        </p>
      </div>
    </div>
  );
}
