import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Lock, Phone } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { trpc } from "@/lib/trpc";
import { getAuthErrorMessage } from "@/lib/errors";

export default function CustomerLogin() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);

  const loginMut = trpc.aroAuth.customerLogin.useMutation({
    onSuccess: () => { window.location.href = "/home"; },
    onError: (e) => {
      if (e.data?.code === "NOT_FOUND") {
        navigate("/account-not-found?role=customer");
        return;
      }
      setError(getAuthErrorMessage(e));
    },
  });

  return (
    <AuthForm
      title="お客様ログイン"
      subtitle="Customer Login"
      fields={[
        { name: "identifier", label: "電話番号", type: "tel", inputMode: "tel", placeholder: "09012345678", icon: <Phone className="w-4 h-4" /> },
        { name: "password", label: "パスワード", type: "password", placeholder: "パスワード", icon: <Lock className="w-4 h-4" /> },
      ]}
      submitLabel="ログイン"
      onSubmit={async (d) => {
        setError(null);
        await loginMut.mutateAsync({ identifier: d.identifier.trim(), password: d.password });
      }}
      isLoading={loginMut.isPending}
      error={error}
      footer={(
        <>
          <Link href="/customer/register" className="text-primary font-medium hover:underline">新規登録</Link>
          {" "}|{" "}
          <Link href="/roles" className="text-muted-foreground hover:underline">ロール選択に戻る</Link>
        </>
      )}
    />
  );
}
