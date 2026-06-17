import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Mail, Lock } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { trpc } from "@/lib/trpc";
import { getAuthErrorMessage } from "@/lib/errors";

export default function TherapistLogin() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const loginMut = trpc.aroAuth.therapistLogin.useMutation({
    onSuccess: () => { window.location.href = "/therapist/dashboard"; },
    onError: (e) => { if (e.data?.code === "NOT_FOUND") { navigate("/account-not-found?role=therapist"); return; } setError(getAuthErrorMessage(e)); },
  });
  return (
    <AuthForm
      title="セラピストログイン" subtitle="Therapist Login"
      fields={[
        { name: "email", label: "メールアドレス", type: "email", placeholder: "therapist@example.com", icon: <Mail className="w-4 h-4" /> },
        { name: "password", label: "パスワード", type: "password", placeholder: "••••••••", icon: <Lock className="w-4 h-4" /> },
      ]}
      submitLabel="ログイン"
      onSubmit={async (d) => { setError(null); await loginMut.mutateAsync({ email: d.email.trim(), password: d.password }); }}
      isLoading={loginMut.isPending} error={error} showCrashPassword
      footer={<><Link href="/therapist/register" className="text-primary font-medium hover:underline">新規登録</Link>{" "}|{" "}<Link href="/" className="text-muted-foreground hover:underline">ロール選択に戻る</Link></>}
    />
  );
}
