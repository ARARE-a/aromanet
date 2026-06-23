import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Building2, ChevronRight, Heart, PlayCircle, User } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";

const roles = [
  {
    id: "store",
    label: "店舗",
    sublabel: "Store",
    description: "予約・売上・セラピスト管理",
    loginPath: "/store/login",
    dashboardPath: "/store/dashboard",
    demoPath: "/api/demo-login?role=store",
    icon: Building2,
    iconClass: "from-[#00645f] to-[#008982]",
  },
  {
    id: "therapist",
    label: "セラピスト",
    sublabel: "Therapist",
    description: "出勤・予約・投稿管理",
    loginPath: "/therapist/login",
    dashboardPath: "/therapist/dashboard",
    demoPath: "/api/demo-login?role=therapist",
    icon: Heart,
    iconClass: "from-[#008982] to-[#31b6ae]",
  },
  {
    id: "customer",
    label: "お客様",
    sublabel: "Customer",
    description: "検索・予約・マイページ",
    loginPath: "/customer/login",
    dashboardPath: "/home",
    demoPath: "/api/demo-login?role=customer",
    icon: User,
    iconClass: "from-[#b99450] to-[#d1b777]",
  },
] as const;

export default function RoleSelect() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (isLoading || !session?.role) return;
    const currentRole = roles.find((role) => role.id === session.role);
    if (currentRole) {
      navigate(currentRole.dashboardPath);
    }
  }, [isLoading, navigate, session?.role]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-[#f7fffd] to-[#e6fbf8] text-[#1b2423]">
      <section className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 py-12 sm:max-w-[440px]">
        <div className="flex flex-1 flex-col justify-center">
          <header className="mb-8 text-center">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#00645f] via-[#6f9285] to-[#c7a66b] shadow-lg shadow-[#00645f]/10">
              <Heart className="h-8 w-8 fill-white text-white" />
            </div>
            <h1 className="font-serif text-3xl text-[#2b645d]">AromaNet</h1>
            <p className="mt-2 text-sm font-medium text-[#425754]">
              メンズエステ予約・管理プラットフォーム
            </p>
            <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-gradient-to-r from-[#00645f] to-[#c7a66b]" />
          </header>

          <div className="space-y-4">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <article
                  key={role.id}
                  className="overflow-hidden rounded-2xl border border-[#dde9e6] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                >
                  <Link
                    href={role.loginPath}
                    className="flex min-h-[78px] items-center gap-4 px-4 py-4 transition-colors active:bg-[#f3fbf9]"
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
                    <ChevronRight className="h-5 w-5 text-[#6f7a78]" />
                  </Link>

                  <div className="border-t border-[#edf3f1] px-4 pb-4 pt-3">
                    <a
                      href={role.demoPath}
                      className="flex min-h-10 items-center justify-center rounded-xl border border-[#cfe4df] bg-[#f7fffd] text-sm font-bold text-[#005b56] transition-colors active:bg-[#e8f7f4]"
                    >
                      <PlayCircle className="mr-2 h-4 w-4" />
                      {role.label}デモを見る
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-[#dbe9e5] bg-white/80 p-4 text-center shadow-sm">
            <p className="text-sm font-bold text-[#24413d]">
              ID・パスワードなしでデモ確認できます
            </p>
            <p className="mt-1 text-xs leading-5 text-[#66726f]">
              確認用データのみを開くため、実店舗データとは分けて確認できます。
            </p>
          </div>
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
