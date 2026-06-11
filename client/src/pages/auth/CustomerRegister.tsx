import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Mail, Lock, User } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { trpc } from "@/lib/trpc";

export default function CustomerRegister() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const regMut = trpc.aroAuth.customerRegister.useMutation({
    onSuccess: () => { window.location.href = "/home"; },
    onError: (e) => setError(e.message),
  });
  return (
    <AuthForm
      title="お客様新規登録" subtitle="Customer Registration"
      fields={[
        { name: "displayName", label: "ニックネーム", type: "text", placeholder: "ニックネーム", icon: <User className="w-4 h-4" /> },
        { name: "email", label: "メールアドレス", type: "email", placeholder: "customer@example.com", icon: <Mail className="w-4 h-4" /> },
        { name: "password", label: "パスワード（8文字以上）", type: "password", placeholder: "8文字以上", icon: <Lock className="w-4 h-4" /> },
        { name: "confirmPassword", label: "パスワード確認", type: "password", placeholder: "••••••••", icon: <Lock className="w-4 h-4" /> },
      ]}
      submitLabel="登録する（18歳以上）"
      onSubmit={async (d) => {
        setError(null);
        if (d.password !== d.confirmPassword) { setError("パスワードが一致しません"); return; }
        await regMut.mutateAsync({ displayName: d.displayName, email: d.email, password: d.password, ageConfirmed: true });
      }}
      isLoading={regMut.isPending} error={error}
      footer={<>すでにアカウントをお持ちの方は{" "}<Link href="/customer/login" className="text-primary font-medium hover:underline">ログイン</Link></>}
    />
  );
}
