import { Link } from "wouter";
import { AlertTriangle, Building2, Heart, PlayCircle, User } from "lucide-react";

const demoRoles = [
  {
    label: "店舗デモ",
    sublabel: "Store Demo",
    description: "予約確認、担当割り当て、売上、給与、顧客管理を確認できます。",
    demoPath: "/api/demo-login?role=store",
    icon: Building2,
    iconClass: "from-[#00645f] to-[#008982]",
  },
  {
    label: "セラピストデモ",
    sublabel: "Therapist Demo",
    description: "出勤申請、予約確認、投稿、顧客メモ、売上確認を試せます。",
    demoPath: "/api/demo-login?role=therapist",
    icon: Heart,
    iconClass: "from-[#008982] to-[#31b6ae]",
  },
  {
    label: "お客様デモ",
    sublabel: "Customer Demo",
    description: "検索、予約、メッセージ、お気に入り、マイページを確認できます。",
    demoPath: "/api/demo-login?role=customer",
    icon: User,
    iconClass: "from-[#b99450] to-[#d1b777]",
  },
] as const;

export default function DemoSelect() {
  const isUnavailable =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("unavailable") === "1";

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-[#f7fffd] to-[#e6fbf8] text-[#1b2423]">
      <section className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 py-12 sm:max-w-[440px]">
        <div className="flex flex-1 flex-col justify-center">
          <header className="mb-8 text-center">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#00645f] via-[#6f9285] to-[#c7a66b] shadow-lg shadow-[#00645f]/10">
              <PlayCircle className="h-8 w-8 fill-white text-white" />
            </div>
            <h1 className="font-serif text-3xl text-[#2b645d]">AromaNet Demo</h1>
            <p className="mt-2 text-sm font-medium text-[#425754]">
              ID・パスワードなしで確認用データに入れます。
            </p>
            <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-gradient-to-r from-[#00645f] to-[#c7a66b]" />
          </header>

          {isUnavailable && (
            <div className="mb-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                デモ環境の準備がまだ完了していません。Renderの
                DEMO_DATABASE_URL設定と再デプロイを確認してください。
              </p>
            </div>
          )}

          <div className="space-y-4">
            {demoRoles.map((role) => {
              const Icon = role.icon;
              return (
                <a
                  key={role.label}
                  href={role.demoPath}
                  className="flex min-h-[88px] items-center gap-4 rounded-2xl border border-[#dde9e6] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-colors active:bg-[#f3fbf9]"
                >
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${role.iconClass} text-white shadow-sm`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="flex items-baseline gap-2">
                      <span className="text-lg font-bold">{role.label}</span>
                      <span className="text-xs font-semibold text-[#73817f]">
                        {role.sublabel}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm font-medium text-[#5f6d6a]">
                      {role.description}
                    </span>
                  </span>
                  <PlayCircle className="h-5 w-5 text-[#00645f]" />
                </a>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-[#dbe9e5] bg-white/80 p-4 text-center shadow-sm">
            <p className="text-sm font-bold text-[#24413d]">
              デモ専用の分離データです
            </p>
            <p className="mt-1 text-xs leading-5 text-[#66726f]">
              実店舗の顧客情報とは分けた確認用アカウントでログインします。本番利用は必ず通常ログインから入ってください。
            </p>
          </div>

          <Link
            href="/roles"
            className="mt-4 block text-center text-sm font-bold text-[#00645f]"
          >
            本番ログイン入口に戻る
          </Link>
        </div>

        <footer className="pb-4 pt-8 text-center">
          <p className="text-xs text-[#8b9996]">
            © 2024 AromaNet. All rights reserved.
          </p>
          <div className="mt-3 flex justify-center gap-4 text-xs font-medium text-[#5b6a67]">
            <Link href="/terms">利用規約</Link>
            <Link href="/privacy">プライバシー</Link>
            <Link href="/contact">問い合わせ</Link>
          </div>
        </footer>
      </section>
    </main>
  );
}
