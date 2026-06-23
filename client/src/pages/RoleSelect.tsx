import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Building2, Heart, User } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";

const roles = [
  {
    id: "store",
    label: "店舗",
    sublabel: "Store",
    icon: Building2,
    loginPath: "/store/login",
    registerPath: "/store/register",
    dashPath: "/store/dashboard",
    demoPath: "/api/demo-login?role=store",
    description: "予約、出勤、顧客、売上、女子給を管理します。",
  },
  {
    id: "therapist",
    label: "セラピスト",
    sublabel: "Therapist",
    icon: Heart,
    loginPath: "/therapist/login",
    registerPath: "/therapist/register",
    dashPath: "/therapist/dashboard",
    demoPath: "/api/demo-login?role=therapist",
    description: "出勤、予約、投稿、顧客メモ、売上を確認します。",
  },
  {
    id: "customer",
    label: "お客様",
    sublabel: "Customer",
    icon: User,
    loginPath: "/customer/login",
    registerPath: "/customer/register",
    dashPath: "/home",
    demoPath: "/api/demo-login?role=customer",
    description: "店舗検索、電話番号登録、予約、メッセージを利用します。",
  },
];

export default function RoleSelect() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (isLoading || !session?.role) return;
    const role = roles.find((item) => item.id === session.role);
    if (role) navigate(role.dashPath);
  }, [session, isLoading, navigate]);

  return (
    <main className="min-h-screen bg-[#fbfcfb] text-[#171b1b]">
      <section className="border-b border-[#e7ece8] bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-4">
          <Link href="/roles" className="font-serif text-2xl text-[#245c55]">
            AromaNet
          </Link>
          <div className="flex items-center gap-3 text-xs text-[#687674]">
            <Link href="/terms">利用規約</Link>
            <Link href="/privacy">プライバシー</Link>
            <Link href="/contact">問い合わせ</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 py-8">
        <div className="mb-6">
          <p className="text-sm font-semibold text-[#00645e]">AromaNet</p>
          <h1 className="mt-2 text-3xl font-bold">ロールを選択</h1>
          <p className="mt-3 text-sm leading-6 text-[#5d6866]">
            ログイン、新規登録、デモ確認をここから開始できます。デモはID/パスワード不要の確認用アカウントで開きます。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <article key={role.id} className="rounded-2xl border border-[#e1ebe8] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e4f4f2] text-[#005b56]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold">{role.label}</h2>
                    <p className="text-xs text-[#7a8583]">{role.sublabel}</p>
                  </div>
                </div>
                <p className="mt-4 min-h-12 text-sm leading-6 text-[#5d6866]">{role.description}</p>
                <div className="mt-5 space-y-2">
                  <a
                    href={role.demoPath}
                    className="flex min-h-11 items-center justify-center rounded-xl bg-[#005b56] px-4 text-sm font-semibold text-white"
                  >
                    デモを開く
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={role.loginPath}
                      className="flex min-h-10 items-center justify-center rounded-xl border border-[#d7e2df] text-sm font-semibold"
                    >
                      ログイン
                    </Link>
                    <Link
                      href={role.registerPath}
                      className="flex min-h-10 items-center justify-center rounded-xl border border-[#d7e2df] text-sm font-semibold"
                    >
                      新規登録
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-[#e1ebe8] bg-white p-4 text-sm leading-6 text-[#5d6866]">
          <p className="font-semibold text-[#23302f]">本番URLについて</p>
          <p className="mt-1">
            現在は本番アプリとデモ入口を同じドメイン内で運用します。必要になれば、あとからデモ専用ドメインを分けられます。
          </p>
        </div>
      </section>
    </main>
  );
}
