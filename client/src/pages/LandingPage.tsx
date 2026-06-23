import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  CheckCircle2,
  Copy,
  KeyRound,
  Lock,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";

const DEMO_PASSWORD = "DY3VoPOcDnCZBtsmW0MaJsHC";
const CONTACT_EMAIL = "noreply@arare-ai.jp";

const demoAccounts = [
  {
    role: "店舗デモ",
    title: "店舗オーナー・受付向け",
    id: "showcase-store@aromanet.club",
    loginUrl: "/store/login",
    icon: Store,
    checks: ["予約確認", "担当割当", "売上管理", "女子給管理"],
  },
  {
    role: "セラピストデモ",
    title: "出勤・予約・売上確認向け",
    id: "showcase-therapist@aromanet.club",
    loginUrl: "/therapist/login",
    icon: UserRound,
    checks: ["本日の予約", "出勤申請", "投稿", "売上確認"],
  },
  {
    role: "顧客デモ",
    title: "検索・予約・メッセージ向け",
    id: "showcase-customer@aromanet.club",
    loginUrl: "/customer/login",
    icon: Phone,
    checks: ["SMS登録", "店舗検索", "予約", "お気に入り"],
  },
];

const painPoints = [
  "LINE、電話、メモに予約が散らばり、確認漏れが起きやすい",
  "セラピストの出勤予定と予約枠がズレて、手戻りが発生する",
  "売上と女子給の集計を手作業で合わせる時間がかかる",
  "顧客の電話番号、来店履歴、NG情報を店舗内で共有しづらい",
  "緊急時にアカウント情報を整理する導線が用意されていない",
];

const featureCards = [
  {
    icon: CalendarCheck2,
    title: "出勤枠だけ予約受付",
    text: "セラピストの出勤予定がある日時だけ予約できます。同じ顧客、同じセラピストの重複予約も防ぎます。",
  },
  {
    icon: UsersRound,
    title: "指名無しは店舗が担当割当",
    text: "顧客が指名無しで予約した場合、店舗側で出勤中のセラピストを選んで担当にできます。",
  },
  {
    icon: Phone,
    title: "顧客は電話番号で登録",
    text: "顧客は電話番号とSMS認証で登録。店舗が予約者を把握しやすく、同一電話番号の重複登録も抑えます。",
  },
  {
    icon: MessageCircle,
    title: "3者メッセージ",
    text: "店舗と顧客、セラピストと顧客、店舗とセラピストのやり取りをアプリ内に集約します。",
  },
  {
    icon: WalletCards,
    title: "売上・女子給を自動反映",
    text: "施術完了後、売上と女子給が自動で集計されます。バック率、調整金、支払い状態も管理できます。",
  },
  {
    icon: KeyRound,
    title: "緊急時のアカウント保護",
    text: "通常パスワードとは別に、緊急削除用パスワードを設定できます。入力時に予約、メッセージ、投稿、顧客履歴などを削除します。",
  },
];

const screenHighlights = [
  {
    label: "店舗ダッシュボード",
    title: "本日の予約、売上、未読、出勤状況を一目で確認",
    icon: Store,
    rows: ["本日予約 4件", "月間売上 ¥39k", "確認待ち 3件"],
  },
  {
    label: "予約管理",
    title: "確認待ち、確定、施術中、完了までステータス管理",
    icon: CalendarCheck2,
    rows: ["指名無し予約", "担当: 未定", "担当割当"],
  },
  {
    label: "給与管理",
    title: "女子給の見込み、調整、支払い済みを管理",
    icon: WalletCards,
    rows: ["売上 ¥66,000", "女子給 ¥39,200", "調整 +¥2,000"],
  },
  {
    label: "顧客ホーム",
    title: "検索、投稿、ストーリー、予約へつながるSNS型導線",
    icon: Search,
    rows: ["出勤中のセラピスト", "お気に入り", "電話番号で予約"],
  },
];

const flowSteps = [
  "店舗アカウントを作成",
  "招待URLでセラピスト登録",
  "セラピストが出勤予定を登録",
  "顧客が電話番号/SMS認証で予約",
  "店舗が確認し、必要なら担当を割当",
  "施術完了後に売上・女子給へ反映",
];

function CtaLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const classes =
    variant === "primary"
      ? "bg-[#005f5a] text-white shadow-lg shadow-teal-950/15 hover:bg-[#004f4b]"
      : variant === "secondary"
        ? "border border-[#005f5a]/25 bg-white text-[#005f5a] hover:bg-[#f4fbf9]"
        : "text-[#005f5a] hover:bg-[#f4fbf9]";

  return (
    <a
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition ${classes}`}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </a>
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
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b79b5b]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-[#111827] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-8 text-slate-600">{text}</p>
    </div>
  );
}

function IconBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f4f1] text-[#005f5a]">
      <Icon className="h-5 w-5" />
    </div>
  );
}

function DemoAccountCard({
  account,
  copied,
  onCopy,
}: {
  account: (typeof demoAccounts)[number];
  copied: string | null;
  onCopy: (value: string, label: string) => void;
}) {
  const Icon = account.icon;

  return (
    <article className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <IconBadge icon={Icon} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#005f5a]">{account.role}</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{account.title}</h3>
        </div>
      </div>

      <div className="mt-5 space-y-3 rounded-[8px] bg-slate-50 p-4 text-sm">
        <CopyRow
          label="ID"
          value={account.id}
          copied={copied}
          onCopy={() => onCopy(account.id, account.role)}
        />
        <CopyRow
          label="PASS"
          value={DEMO_PASSWORD}
          copied={copied}
          onCopy={() => onCopy(DEMO_PASSWORD, "共通パスワード")}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {account.checks.map((check) => (
          <span
            key={check}
            className="rounded-full bg-[#fff8e6] px-3 py-1 text-xs font-bold text-[#8a6b23]"
          >
            {check}
          </span>
        ))}
      </div>

      <a
        href={account.loginUrl}
        className="mt-5 flex min-h-12 items-center justify-center rounded-full bg-[#005f5a] px-4 text-sm font-black text-white transition hover:bg-[#004f4b]"
      >
        {account.role}でログイン
      </a>
    </article>
  );
}

function CopyRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: string | null;
  onCopy: () => void;
}) {
  const isCopied = copied === label || copied === value;

  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-xs font-black text-slate-500">{label}</span>
      <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded bg-white px-2 py-1 text-xs font-bold text-slate-800">
        {value}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
        aria-label={`${label}をコピー`}
      >
        {isCopied ? <CheckCircle2 className="h-4 w-4 text-[#005f5a]" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ScreenCard({ item }: { item: (typeof screenHighlights)[number] }) {
  const Icon = item.icon;

  return (
    <article className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <IconBadge icon={Icon} />
        <p className="text-sm font-black text-[#005f5a]">{item.label}</p>
      </div>
      <h3 className="mt-4 text-xl font-black leading-8 text-slate-950">{item.title}</h3>
      <div className="mt-5 space-y-2 rounded-[8px] bg-slate-50 p-4">
        {item.rows.map((row) => (
          <div key={row} className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <CheckCircle2 className="h-4 w-4 text-[#005f5a]" />
            {row}
          </div>
        ))}
      </div>
    </article>
  );
}

function HeroPreview() {
  return (
    <div className="rounded-[8px] border border-[#d9c282]/70 bg-white p-4 shadow-2xl shadow-teal-950/10">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#b79b5b]">
            Store Dashboard
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">AromaNet Showcase 銀座</h2>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#005f5a] text-white">
          <Store className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          ["本日予約", "4件"],
          ["月間売上", "¥39k"],
          ["確認待ち", "3件"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[8px] bg-[#f4fbf9] p-3">
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-black text-[#005f5a]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[8px] border border-rose-200 bg-rose-50 p-4">
        <div className="flex items-start gap-3">
          <BellRing className="mt-1 h-5 w-5 text-rose-600" />
          <div>
            <p className="font-black text-rose-700">予約通知が10分以上未読です</p>
            <p className="mt-1 text-sm font-bold text-rose-700/80">月屋 / 2026-06-23 18:00</p>
          </div>
        </div>
        <button className="mt-4 min-h-11 w-full rounded-full bg-[#005f5a] text-sm font-black text-white">
          予約を確認
        </button>
      </div>

      <div className="mt-4 rounded-[8px] bg-slate-50 p-4">
        <p className="text-sm font-black text-slate-950">確認待ち予約</p>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[8px] bg-white p-3">
          <div>
            <p className="font-black">06/23 12:00 - 13:00</p>
            <p className="text-sm font-bold text-slate-500">指名無し / スタンダード60分</p>
          </div>
          <span className="rounded-full bg-[#fff8e6] px-3 py-1 text-xs font-black text-[#8a6b23]">
            担当割当
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const root = document.getElementById("root");
    root?.classList.add("lp-root-wide");
    return () => root?.classList.remove("lp-root-wide");
  }, []);

  const copyText = async (value: string, _label: string) => {
    await navigator.clipboard?.writeText(value);
    setCopied(value);
    window.setTimeout(() => setCopied(null), 1400);
  };

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#111827]">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href="/" className="font-serif text-2xl font-semibold text-[#005f5a]">
            AromaNet
          </a>
          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <a href="#features">機能</a>
            <a href="#security">緊急保護</a>
            <a href="#demo">デモ</a>
            <a href="#flow">導入の流れ</a>
          </nav>
          <a
            href="/roles"
            className="rounded-full bg-[#005f5a] px-4 py-2 text-sm font-black text-white"
          >
            アプリを開く
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-x-0 top-0 h-2 bg-[#005f5a]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(390px,470px)] lg:px-8 lg:py-20">
          <div className="flex min-w-0 flex-col justify-center">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[#fff8e6] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#8a6b23]">
              <Sparkles className="h-4 w-4" />
              Salon SNS / SaaS for Store Owners
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
              予約・出勤・女子給まで、店舗運営を1つに。
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-9 text-slate-600">
              AromaNetは、メンズエステ店舗の予約管理、セラピスト出勤、顧客メモ、
              メッセージ、売上、女子給をまとめて扱える店舗向け管理アプリです。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CtaLink href="#demo">デモアカウントを見る</CtaLink>
              <CtaLink href="/store/login" variant="secondary">
                店舗デモでログイン
              </CtaLink>
              <CtaLink href={`mailto:${CONTACT_EMAIL}`} variant="ghost">
                問い合わせ
              </CtaLink>
            </div>

            <div className="mt-8 rounded-[8px] border border-[#d9c282]/80 bg-[#fffaf0] p-4">
              <p className="text-sm font-black text-[#8a6b23]">すぐ試せるデモアカウント</p>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                {demoAccounts.map((account) => (
                  <a
                    key={account.role}
                    href={account.loginUrl}
                    className="rounded-[8px] bg-white p-3 font-bold text-slate-800 shadow-sm"
                  >
                    <span className="block text-[#005f5a]">{account.role}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{account.id}</span>
                  </a>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                <Lock className="h-4 w-4 text-[#005f5a]" />
                共通パスワード: <code className="rounded bg-white px-2 py-1">{DEMO_PASSWORD}</code>
              </div>
            </div>
          </div>

          <HeroPreview />
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8" id="problems">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Store Problems"
            title="店舗運営で散らばりがちな情報を、予約導線に集約します。"
            text="電話、LINE、メモ、表計算で分かれていた作業を、現場が確認しやすい形にまとめます。"
          />
          <div className="mt-10 grid gap-3 lg:grid-cols-5">
            {painPoints.map((point) => (
              <div key={point} className="rounded-[8px] border border-slate-200 bg-white p-5">
                <CheckCircle2 className="h-5 w-5 text-[#b79b5b]" />
                <p className="mt-4 text-sm font-bold leading-7 text-slate-700">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8" id="features">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="What AromaNet Does"
            title="予約、出勤、顧客、メッセージ、売上、女子給を1つで管理。"
            text="店舗、セラピスト、顧客の3画面が連動するので、現場の確認漏れを減らせます。"
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <article
                key={feature.title}
                className="rounded-[8px] border border-slate-200 bg-[#fbfaf7] p-6"
              >
                <IconBadge icon={feature.icon} />
                <h3 className="mt-5 text-xl font-black text-slate-950">{feature.title}</h3>
                <p className="mt-3 text-sm font-bold leading-7 text-slate-600">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Screens"
            title="配信で見せやすい、3者連動の実画面イメージ。"
            text="店舗側の確認待ち、セラピスト側の予約通知、顧客側の予約導線までデモで確認できます。"
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {screenHighlights.map((item) => (
              <ScreenCard key={item.label} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#003f3c] px-4 py-14 text-white sm:px-6 lg:px-8" id="security">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d9c282]">
              Emergency Protection
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              緊急時のアカウント保護として、クラッシュパスワードを用意。
            </h2>
            <p className="mt-5 text-base leading-8 text-white/75">
              通常パスワードとは別の緊急削除用パスワードです。入力時に予約、
              メッセージ、投稿、顧客履歴などを削除し、実行後は通常のログイン失敗画面へ遷移します。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["通常パスワードと分離", "通常ログインとは別の緊急削除用パスワードを設定できます。"],
              ["対象データを整理", "予約、メッセージ、投稿、顧客履歴などをまとめて削除します。"],
              ["実行後の表示を統一", "実行後は通常のログイン失敗画面へ遷移します。"],
              ["ログイン画面には説明を出さない", "通常の登録・ログイン画面には緊急保護の説明を表示しません。"],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[8px] border border-white/15 bg-white/8 p-5">
                <ShieldCheck className="h-5 w-5 text-[#d9c282]" />
                <h3 className="mt-4 font-black">{title}</h3>
                <p className="mt-2 text-sm font-bold leading-7 text-white/70">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8" id="demo">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Demo Accounts"
            title="店舗・セラピスト・顧客の3画面を、すぐに確認できます。"
            text="配信や商談でそのまま使えるデモアカウントです。各ログイン画面へ直接移動できます。"
          />

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {demoAccounts.map((account) => (
              <DemoAccountCard
                key={account.role}
                account={account}
                copied={copied}
                onCopy={copyText}
              />
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CtaLink href="/roles">ロール選択から開く</CtaLink>
            <CtaLink href={`mailto:${CONTACT_EMAIL}`} variant="secondary">
              問い合わせする
            </CtaLink>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8" id="flow">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Onboarding Flow"
            title="導入後の流れもシンプルです。"
            text="店舗登録から予約確認、施術完了、売上・女子給反映まで、現場の順番に沿って進められます。"
          />
          <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
            {flowSteps.map((step, index) => (
              <div key={step} className="rounded-[8px] border border-slate-200 bg-white p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#005f5a] text-sm font-black text-white">
                  {index + 1}
                </div>
                <p className="mt-4 text-sm font-black leading-7 text-slate-800">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[8px] border border-[#d9c282]/80 bg-[#fffaf0] p-8 text-center sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b79b5b]">Try Demo</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
            まずはデモで、予約から女子給反映まで触ってください。
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">
            店舗、セラピスト、顧客の3画面を切り替えながら、実際の導入イメージを確認できます。
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <CtaLink href="#demo">デモアカウントを見る</CtaLink>
            <CtaLink href="/store/login" variant="secondary">
              店舗ログインへ
            </CtaLink>
            <CtaLink href={`mailto:${CONTACT_EMAIL}`} variant="ghost">
              問い合わせ
            </CtaLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-serif text-xl text-[#005f5a]">AromaNet</p>
          <div className="flex flex-wrap gap-4">
            <a href="/legal/terms">利用規約</a>
            <a href="/legal/privacy">プライバシーポリシー</a>
            <a href={`mailto:${CONTACT_EMAIL}`}>問い合わせ</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
