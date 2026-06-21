import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const loginPaths: Record<string, string> = {
  store: "/store/login",
  therapist: "/therapist/login",
  customer: "/customer/login",
};

export default function AccountNotFound() {
  const [, navigate] = useLocation();
  const role = new URLSearchParams(window.location.search).get("role") ?? "";
  const loginPath = loginPaths[role] ?? "/";
  const identifierLabel = role === "customer" ? "電話番号" : "メールアドレス";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-teal-muted flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-primary" />
        </div>

        <div className="space-y-3">
          <h1 className="text-xl font-semibold text-foreground">アカウントが存在しません</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            入力された情報に一致するアカウントは見つかりませんでした。
            <br />
            {identifierLabel}またはパスワードをご確認ください。
          </p>
        </div>

        <Button
          type="button"
          className="w-full h-11 rounded-xl gradient-luxury text-white font-semibold"
          onClick={() => navigate(loginPath)}
        >
          ログイン画面に戻る
        </Button>
      </div>
    </div>
  );
}
