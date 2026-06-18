import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  ChartColumn,
  Heart,
  Link as LinkIcon,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  UserPlus,
  Users,
} from "lucide-react";

const screenshots = {
  customerHome: "/lp/screenshots/customer-home.png",
  customerReservations: "/lp/screenshots/customer-reservations.png",
  customerTherapist: "/lp/screenshots/customer-therapist-detail.png",
  storeDashboard: "/lp/screenshots/store-dashboard.png",
  storeInvite: "/lp/screenshots/store-invite-url.png",
  storePayroll: "/lp/screenshots/store-payroll.png",
  storeReservations: "/lp/screenshots/store-reservations.png",
  therapistDashboard: "/lp/screenshots/therapist-dashboard.png",
  therapistProfile: "/lp/screenshots/therapist-public-profile.png",
  therapistSales: "/lp/screenshots/therapist-sales.png",
  therapistShifts: "/lp/screenshots/therapist-shifts.png",
};

type Feature = {
  icon: LucideIcon;
  title: string;
  text: string;
};

const therapistFeatures: Feature[] = [
  {
    icon: Sparkles,
    title: "SNS型プロフィール",
    text: "写真、投稿、ストーリー、空き枠をひとつのプロフィールに集約。",
  },
  {
    icon: Calendar,
    title: "出勤と予約を確認",
    text: "今日の予約、今週の出勤、顧客メモまでスマホで確認できます。",
  },
  {
    icon: ChartColumn,
    title: "売上・給与の見える化",
    text: "指名本数、売上、バック金額、調整金を月別でチェック。",
  },
];

const storeFeatures: Feature[] = [
  {
    icon: Store,
    title: "店舗運営を一元管理",
    text: "予約、シフト、給与、顧客、メニュー、口コミを同じ管理画面で扱えます。",
  },
  {
    icon: UserPlus,
    title: "招待URLで所属登録",
    text: "店舗が発行したURLから登録したセラピストを自動で所属化。",
  },
  {
    icon: ShieldCheck,
    title: "安全管理も標準装備",
    text: "本人確認、年齢確認、通報、ブロック、NG顧客管理に対応。",
  },
];

const customerFeatures: Feature[] = [
  {
    icon: Search,
    title: "探して比較",
    text: "エリア、出勤、料金、口コミ、空き時間から店舗やセラピストを探せます。",
  },
  {
    icon: Heart,
    title: "お気に入りと再予約",
    text: "気になる店舗、セラピスト、投稿を保存し、履歴から再予約できます。",
  },
  {
    icon: MessageCircle,
    title: "予約前の相談",
    text: "店舗、セラピスト、顧客のメッセージ導線をアプリ内に集約。",
  },
];

const stats = [
  { value: "3ロール", label: "店舗・セラピスト・顧客" },
  { value: "1画面", label: "予約とシフトの確認" },
  { value: "SNS型", label: "投稿・ストーリー・フォロー" },
];

function PhoneMockup({
  src,
  alt,
  label,
  className = "",
}: {
  src: string;
  alt: string;
  label: string;
  className?: string;
}) {
  return (
    <figure className={`lp-phone-frame ${className}`}>
      <div className="lp-phone-speaker" />
      <img src={src} alt={alt} loading="lazy" />
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function FeatureCard({ icon: Icon, title, text }: Feature) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
      <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-[#E8F7F4] text-[#005B55]">
        <Icon className="size-4" />
      </div>
      <h3 className="text-base font-bold text-[#1F2933]">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold tracking-[0.18em] text-[#C8A45D] uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold leading-tight text-[#1F2933] md:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-8 text-slate-600 md:text-base">{text}</p>
    </div>
  );
}

function CtaLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold transition hover:-translate-y-0.5";
  const classes =
    variant === "primary"
      ? "bg-[#005B55] text-white shadow-[0_16px_36px_rgba(0,91,85,0.22)] hover:bg-[#004844]"
      : "border border-slate-200 bg-white text-[#1F2933] hover:border-[#005B55] hover:text-[#005B55]";

  return (
    <a href={href} className={`${base} ${classes}`}>
      {children}
      <ArrowRight className="size-4" />
    </a>
  );
}

export default function LandingPage() {
  return (
    <div className="lp-full-bleed bg-white text-[#1F2933]">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/92 backdrop-blur">
        <div className="lp-container flex h-16 items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3" aria-label="AromaNet">
            <span className="flex size-9 items-center justify-center rounded-md bg-[#005B55] text-sm font-black text-white">
              A
            </span>
            <span className="font-serif text-xl font-semibold text-[#1F2933]">
              AromaNet
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="#therapist" className="hover:text-[#005B55]">
              セラピスト
            </a>
            <a href="#store" className="hover:text-[#005B55]">
              店舗
            </a>
            <a href="#customer" className="hover:text-[#005B55]">
              顧客体験
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="/roles"
              className="hidden rounded-md px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 sm:inline-flex"
            >
              ログイン
            </a>
            <a
              href="/store/register"
              className="inline-flex min-h-10 items-center rounded-md bg-[#005B55] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,91,85,0.18)] hover:bg-[#004844]"
            >
              店舗登録
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-100 bg-[#F8FCFB]">
          <div className="lp-container relative z-10 grid gap-8 pb-10 pt-10 md:pb-14 md:pt-14">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-md border border-[#C8A45D]/30 bg-white px-3 py-2 text-xs font-bold text-[#7B6436] shadow-sm">
                <BadgeCheck className="size-4 text-[#C8A45D]" />
                メンズエステ店舗向け 予約SNS / 管理SaaS
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight text-[#1F2933] md:text-6xl">
                メンズエステ専用の
                <br />
                プロフィール・投稿・予約SNS
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-slate-600 md:text-lg">
                出勤告知、ストーリー、予約、メッセージ、給与管理まで。
                セラピストの集客導線と店舗の運営業務を、ひとつのアプリにまとめます。
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <CtaLink href="/store/register">店舗として始める</CtaLink>
                <CtaLink href="/roles" variant="secondary">
                  デモ画面を見る
                </CtaLink>
              </div>
            </div>

            <div className="lp-hero-stage" aria-label="AromaNet app screenshots">
              <PhoneMockup
                src={screenshots.therapistProfile}
                alt="セラピスト公開プロフィール画面"
                label="Profile"
                className="lp-hero-phone lp-hero-phone-left"
              />
              <PhoneMockup
                src={screenshots.customerHome}
                alt="顧客ホームと検索フィード画面"
                label="Discovery"
                className="lp-hero-phone lp-hero-phone-center"
              />
              <PhoneMockup
                src={screenshots.storeDashboard}
                alt="店舗管理ダッシュボード画面"
                label="Store Ops"
                className="lp-hero-phone lp-hero-phone-right"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-slate-200 bg-white p-4 text-center shadow-[0_12px_32px_rgba(15,23,42,0.04)]"
                >
                  <p className="text-2xl font-black text-[#005B55]">{item.value}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="therapist" className="bg-white py-16 md:py-24">
          <div className="lp-container">
            <SectionHeader
              eyebrow="For Therapists"
              title="Xに貼れる、自分専用プロフィール"
              text="見た目はSNSのように軽く、裏側は予約・出勤・売上までつながる。セラピストが自分の集客導線を持てる画面です。"
            />

            <div className="mt-12 grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {therapistFeatures.map((feature) => (
                  <FeatureCard key={feature.title} {...feature} />
                ))}
              </div>
              <div className="lp-phone-row">
                <PhoneMockup
                  src={screenshots.therapistProfile}
                  alt="セラピスト公開プロフィール"
                  label="Public profile"
                />
                <PhoneMockup
                  src={screenshots.therapistDashboard}
                  alt="セラピストダッシュボード"
                  label="Dashboard"
                  className="hidden sm:block"
                />
                <PhoneMockup
                  src={screenshots.therapistSales}
                  alt="売上確認画面"
                  label="Sales"
                  className="hidden md:block"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="store" className="bg-[#F6F7F8] py-16 md:py-24">
          <div className="lp-container">
            <SectionHeader
              eyebrow="For Stores"
              title="予約・シフト・給与をまとめて管理"
              text="受付、店長、オーナーが見たい情報をスマホで確認。セラピスト登録は店舗発行URLから行い、所属管理もシンプルにします。"
            />

            <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="lp-phone-row lg:order-1">
                <PhoneMockup
                  src={screenshots.storeDashboard}
                  alt="店舗ダッシュボード"
                  label="Dashboard"
                />
                <PhoneMockup
                  src={screenshots.storeInvite}
                  alt="セラピスト招待URL発行画面"
                  label="Invite URL"
                  className="hidden sm:block"
                />
                <PhoneMockup
                  src={screenshots.storePayroll}
                  alt="店舗給与管理画面"
                  label="Payroll"
                  className="hidden md:block"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3 lg:order-2 lg:grid-cols-1">
                {storeFeatures.map((feature) => (
                  <FeatureCard key={feature.title} {...feature} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="customer" className="bg-white py-16 md:py-24">
          <div className="lp-container">
            <SectionHeader
              eyebrow="For Customers"
              title="探す、比較する、予約する"
              text="顧客は店舗やセラピストを検索し、空き枠、口コミ、料金を見ながら予約。お気に入りや会員レベルでリピート導線も作れます。"
            />

            <div className="mt-12 grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {customerFeatures.map((feature) => (
                  <FeatureCard key={feature.title} {...feature} />
                ))}
              </div>
              <div className="lp-phone-row">
                <PhoneMockup
                  src={screenshots.customerHome}
                  alt="顧客ホーム画面"
                  label="Home"
                />
                <PhoneMockup
                  src={screenshots.customerTherapist}
                  alt="セラピスト詳細画面"
                  label="Therapist detail"
                  className="hidden sm:block"
                />
                <PhoneMockup
                  src={screenshots.customerReservations}
                  alt="顧客予約管理画面"
                  label="Reservations"
                  className="hidden md:block"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#E8F7F4] py-16 md:py-20">
          <div className="lp-container">
            <div className="grid items-center gap-10 md:grid-cols-[1fr_0.85fr]">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-[#C8A45D] uppercase">
                  Early Access
                </p>
                <h2 className="mt-3 text-3xl font-black leading-tight text-[#1F2933] md:text-5xl">
                  まずは店舗の運営導線から、すぐ使える形へ。
                </h2>
                <p className="mt-5 text-sm leading-8 text-slate-600 md:text-base">
                  公開プロフィールだけで終わらせず、予約確認、シフト申請、顧客メモ、
                  給与確認までつながる導線を用意しています。営業前の検証やデモにも使いやすい構成です。
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <CtaLink href="/store/register">店舗アカウントを作る</CtaLink>
                  <CtaLink href="/store/login" variant="secondary">
                    店舗ログイン
                  </CtaLink>
                </div>
              </div>

              <div className="rounded-md border border-white/70 bg-white/75 p-5 shadow-[0_20px_60px_rgba(0,91,85,0.08)]">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <div className="flex size-10 items-center justify-center rounded-md bg-[#005B55] text-white">
                    <LinkIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#1F2933]">招待URL登録</p>
                    <p className="text-xs text-slate-500">店舗が発行したURLで所属を自動連携</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 size-2 rounded-full bg-[#005B55]" />
                    店舗ごとにセラピスト登録URLを発行
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 size-2 rounded-full bg-[#005B55]" />
                    URL経由の登録は自動でその店舗の所属に設定
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 size-2 rounded-full bg-[#005B55]" />
                    複数店舗所属を公開プロフィールに出さない運用に対応
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#1F2933] py-16 text-white md:py-24">
          <div className="lp-container text-center">
            <p className="text-xs font-bold tracking-[0.18em] text-[#C8A45D] uppercase">
              AromaNet
            </p>
            <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black leading-tight md:text-5xl">
              集客から予約、リピート管理までをひとつに。
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-slate-300 md:text-base">
              SNSの見やすさと、店舗運営に必要な管理性を両立したメンズエステ向けプラットフォームです。
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <CtaLink href="/store/register">店舗として始める</CtaLink>
              <CtaLink href="/roles" variant="secondary">
                ログイン画面へ
              </CtaLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white py-8">
        <div className="lp-container flex flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-md bg-[#005B55] text-xs font-black text-white">
              A
            </span>
            <span className="font-serif text-lg font-semibold text-[#1F2933]">
              AromaNet
            </span>
          </div>
          <div className="flex gap-4">
            <a href="/roles" className="hover:text-[#005B55]">
              ログイン
            </a>
            <a href="/store/register" className="hover:text-[#005B55]">
              店舗登録
            </a>
            <a href="/security" className="hover:text-[#005B55]">
              安全管理
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
