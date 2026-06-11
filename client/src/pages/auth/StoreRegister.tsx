import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Mail, Lock, Building2 } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { trpc } from "@/lib/trpc";

export default function StoreRegister() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const regMut = trpc.aroAuth.storeRegister.useMutation({
    onSuccess: () => { window.location.href = "/store/dashboard"; },
    onError: (e) => setError(e.message),
  });
  return (
    <AuthForm
      title="店舗新規登録" subtitle="Store Registration"
      fields={[
        { name: "storeName", label: "店舗名", type: "text", placeholder: "サロン名", icon: <Building2 className="w-4 h-4" /> },
        { name: "email", label: "メールアドレス", type: "email", placeholder: "store@example.com", icon: <Mail className="w-4 h-4" /> },
        { name: "password", label: "パスワード（8文字以上）", type: "password", placeholder: "8文字以上", icon: <Lock className="w-4 h-4" /> },
        { name: "confirmPassword", label: "パスワード確認", type: "password", placeholder: "••••••••", icon: <Lock className="w-4 h-4" /> },
      ]}
      submitLabel="登録する"
      onSubmit={async (d) => {
        setError(null);
        if (d.password !== d.confirmPassword) { setError("パスワードが一致しません"); return; }
        await regMut.mutateAsync({ storeName: d.storeName, email: d.email, password: d.password });
      }}
      isLoading={regMut.isPending} error={error}
      footer={<>すでにアカウントをお持ちの方は{" "}<Link href="/store/login" className="text-primary font-medium hover:underline">ログイン</Link></>}
    />
  );
}
