import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Mail, Lock, User } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";

export default function TherapistRegister() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { refetch } = useSession();
  const regMut = trpc.aroAuth.therapistRegister.useMutation({
    onSuccess: () => { refetch(); navigate("/therapist/dashboard"); },
    onError: (e) => setError(e.message),
  });
  return (
    <AuthForm
      title="セラピスト新規登録" subtitle="Therapist Registration"
      fields={[
        { name: "displayName", label: "源氏名（表示名）", type: "text", placeholder: "源氏名", icon: <User className="w-4 h-4" /> },
        { name: "email", label: "メールアドレス", type: "email", placeholder: "therapist@example.com", icon: <Mail className="w-4 h-4" /> },
        { name: "password", label: "パスワード（8文字以上）", type: "password", placeholder: "8文字以上", icon: <Lock className="w-4 h-4" /> },
        { name: "confirmPassword", label: "パスワード確認", type: "password", placeholder: "••••••••", icon: <Lock className="w-4 h-4" /> },
      ]}
      submitLabel="登録する"
      onSubmit={async (d) => {
        setError(null);
        if (d.password !== d.confirmPassword) { setError("パスワードが一致しません"); return; }
        await regMut.mutateAsync({ displayName: d.displayName, email: d.email, password: d.password });
      }}
      isLoading={regMut.isPending} error={error}
      footer={<>すでにアカウントをお持ちの方は{" "}<Link href="/therapist/login" className="text-primary font-medium hover:underline">ログイン</Link></>}
    />
  );
}
