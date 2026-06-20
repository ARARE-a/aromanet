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
    text: "写真、投稿、ストーリー、空き枠をひとつのプロフィールに集約。指名につながる見せ方を作れます。",
  },
  {
    icon: Calendar,
    title: "出勤と予約を確認",
    text: "出勤申請、承認状況、今日の予約、顧客メモをスマホで確認。店舗との連携もスムーズです。",
  },
  {
    icon: ChartColumn,
    title: "売上と給与を見える化",
    text: "売上、指名本数、バック金額、調整金を月別で確認。自分の成果を把握できます。",
  },
];

const storeFeatures: Feature[] = [
  {
    icon: Store,
    title: "店舗運営を一元管理",
    text: "予約、シフト、給与、セラピスト、顧客、口コミを同じ管理画面で扱えます。",
  },
  {
    icon: UserPlus,
    title: "招待URLで所属登録",
    text: "店舗が発行したURLから登録したセラピストを、自動でその店舗所属にできます。",
  },
  {
    icon: ShieldCheck,
    title: "安全管理にも対応",
    text: "本人確認、年齢確認、通報、ブロック、NG顧客管理など、運営に必要な導線を用意しています。",
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
    title: "お気に入りから再予約",
    text: "店舗、セラピスト、投稿を保存し、予約履歴から次回予約につなげられます。",
  },
  {
    icon: MessageCircle,
    title: "予約前に相談",
    text: "店舗、セラピスト、顧客のメッセージ導線をアプリ内にまとめます。",
  },
];

const stats = [
  { value: "3ロール", label: "店舗・セラピスト・顧客" },
  { value: "1画面", label: "予約とシフトを確認" },
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
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C8A45D]">
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
            <span className="text-lg font-black tracking-wide">AromaNet</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <a href="#therapist" className="hover:text-[#005B55]">
              セラピスト
            </a>
            <a href="#store" className="hover:text-[#005B55]">
              店舗
            </a>
            <a href="#customer" className="hover:text-[#005B55]">
              顧客
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="/roles"
              className="hidden rounded-md px-3 py-2 text-sm font-bold text-slate-600 hover:text-[#005B55] sm:inline-flex"
            >
              ログイン
            </a>
            <a
              href="/store/register"
              className="rounded-md bg-[#005B55] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#004844]"
            >
              店舗登録
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="overflow-hidden bg-[#F6F7F8]">
          <div className="lp-container grid min-h-[calc(100vh-4rem)] items-center gap-10 py-12 md:grid-cols-[0.95fr_1.05fr] md:py-16">
            <div className="max-w-2xl">
              <p className="inline-flex rounded-md border border-[#C8A45D]/40 bg-white px-3 py-1 text-xs font-bold tracking-[0.14em] text-[#9B7A33]">
                SALON SNS & RESERVATION
              </p>
              <h1 className="mt-5 text-4xl font-black leading-tight text-[#1F2933] md:text-6xl">
                メンズエステ運営を、SNSと予約管理でひとつに。
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 md:text-lg">
                AromaNetは、店舗・セラピスト・顧客をつなぐ予約管理プラットフォームです。集客、予約、出勤、メッセージ、給与確認までスマホで扱えます。
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <CtaLink href="/store/register">店舗として始める</CtaLink>
                <CtaLink href="/roles" variant="secondary">
                  アプリ入口を見る
                </CtaLink>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
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
            <div className="lp-phone-row">
              <PhoneMockup
                src={screenshots.customerHome}
                alt="顧客ホーム画面"
                label="Customer home"
              />
              <PhoneMockup
                src={screenshots.storeDashboard}
                alt="店舗ダッシュボード画面"
                label="Store dashboard"
                className="hidden sm:block"
              />
              <PhoneMockup
                src={screenshots.therapistProfile}
                alt="セラピスト公開プロフィール画面"
                label="Therapist profile"
                className="hidden md:block"
              />
            </div>
          </div>
        </section>

        <section id="therapist" className="bg-white py-16 md:py-24">
          <div className="lp-container">
            <SectionHeader
              eyebrow="For Therapists"
              title="集客、出勤、売上を自分で見られる"
              text="SNSのように見せやすく、業務ツールとして管理しやすいセラピスト画面。出勤申請、予約確認、メッセージ、売上確認までつながります。"
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
              title="予約、シフト、給与をまとめて管理"
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
                  alt="給与管理画面"
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
              text="顧客は店舗やセラピストを検索し、空き枠、口コミ、料金を見ながら予約できます。お気に入りや会員レベルでリピート導線も作れます。"
            />

            <div className="mt-12 grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {customerFeatures.map((feature) => (
                  <FeatureCard key={feature.title} {...feature} />
                ))}
              </div>
              <div className="lp-phone-row">
                <PhoneMockup
                  src={screenshots.customerTherapist}
                  alt="セラピスト詳細画面"
                  label="Therapist detail"
                />
                <PhoneMockup
                  src={screenshots.customerReservations}
                  alt="顧客予約画面"
                  label="Reservations"
                  className="hidden sm:block"
                />
                <PhoneMockup
                  src={screenshots.customerHome}
                  alt="顧客ホーム画面"
                  label="Home"
                  className="hidden md:block"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#F6F7F8] py-16 md:py-24">
          <div className="lp-container">
            <div className="grid gap-4 md:grid-cols-3">
              <FeatureCard
                icon={BadgeCheck}
                title="予約から給与まで連動"
                text="顧客予約、店舗確認、セラピスト反映、売上、給与計算まで同じデータでつながります。"
              />
              <FeatureCard
                icon={LinkIcon}
                title="店舗発行URLで登録"
                text="セラピストは店舗が発行したURLから登録。登録後は自動でその店舗所属になります。"
              />
              <FeatureCard
                icon={Users}
                title="3者のメッセージ"
                text="店舗、セラピスト、顧客のメッセージをアプリ内にまとめ、未読や既読も確認できます。"
              />
            </div>
          </div>
        </section>

        <section className="bg-[#005B55] py-14 text-white">
          <div className="lp-container flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold text-[#F3D28B]">AromaNet</p>
              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                まずは店舗アカウントから始められます。
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">
                営業・検証用の初期版です。導入相談やテスト利用は、店舗アカウント作成後に画面を確認してください。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <CtaLink href="/store/register">店舗アカウントを作る</CtaLink>
              <CtaLink href="/roles" variant="secondary">
                ログイン画面へ
              </CtaLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="lp-container flex flex-col gap-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p className="font-bold text-[#1F2933]">AromaNet</p>
          <div className="flex flex-wrap gap-4">
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
