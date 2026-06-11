import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Mail, Lock } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { trpc } from "@/lib/trpc";

export default function CustomerLogin() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const loginMut = trpc.aroAuth.customerLogin.useMutation({
    onSuccess: () => { window.location.href = "/home"; },
    onError: (e) => { if (e.data?.code === "NOT_FOUND") { navigate("/"); return; } setError(e.message); },
  });
  return (
    <AuthForm
      title="お客様ログイン" subtitle="Customer Login"
      fields={[
        { name: "email", label: "メールアドレス", type: "email", placeholder: "customer@example.com", icon: <Mail className="w-4 h-4" /> },
        { name: "password", label: "パスワード", type: "password", placeholder: "••••••••", icon: <Lock className="w-4 h-4" /> },
      ]}
      submitLabel="ログイン"
      onSubmit={async (d) => { setError(null); await loginMut.mutateAsync({ email: d.email, password: d.password }); }}
      isLoading={loginMut.isPending} error={error} showCrashPassword
      footer={<><Link href="/customer/register" className="text-primary font-medium hover:underline">新規登録</Link>{" "}|{" "}<Link href="/" className="text-muted-foreground hover:underline">ロール選択に戻る</Link></>}
    />
  );
}
