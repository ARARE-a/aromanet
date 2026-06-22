import { useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  CalendarCheck2,
  CheckCircle2,
  Copy,
  KeyRound,
  MessageCircle,
  Phone,
  ShieldCheck,
  Smartphone,
  Store,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";

const DEMO_PASSWORD = "DY3VoPOcDnCZBtsmW0MaJsHC";

const demoAccounts = [
  {
    role: "店舗デモ",
    label: "予約、出勤、売上、女子給を管理",
    loginUrl: "/store/login",
    id: "showcase-store@aromanet.club",
    checks: ["予約確認", "指名無しの担当割当", "売上管理", "女子給管理"],
    icon: Store,
  },
  {
    role: "セラピストデモ",
    label: "出勤、予約、投稿、売上を確認",
    loginUrl: "/therapist/login",
    id: "showcase-therapist@aromanet.club",
    checks: ["本日の予約", "出勤管理", "投稿作成", "売上確認"],
    icon: UserRound,
  },
  {
    role: "顧客デモ",
    label: "検索、予約、DM、お気に入りを体験",
    loginUrl: "/customer/login",
    id: "showcase-customer@aromanet.club",
    checks: ["電話番号ログイン", "店舗検索", "予約作成", "メッセージ"],
    icon: Phone,
  },
];

const featureCards = [
  {
    icon: CalendarCheck2,
    title: "出勤予定と予約を連動",
    text: "セラピストの出勤予定がある枠だけ予約できます。同じ顧客、同じセラピストの重複予約も防ぎます。",
  },
  {
    icon: MessageCircle,
    title: "3者メッセージ",
    text: "店舗と顧客、セラピストと顧客、店舗とセラピストのやり取りをアプリ内に集約します。",
  },
  {
    icon: WalletCards,
    title: "売上と女子給を自動反映",
    text: "施術完了後に売上、バック率、調整金、支払い状況を店舗とセラピスト側へ反映します。",
  },
  {
    icon: BellRing,
    title: "未読予約アラーム",
    text: "予約通知が一定時間未読の場合、セラピスト画面に重要アラートとして表示できます。",
  },
];

const flowItems = [
  "顧客が電話番号とSMS認証で登録",
  "店舗・セラピストを検索",
  "出勤予定がある枠だけ予約",
  "店舗が確認し、指名無しは担当を割当",
  "施術完了後に売上と女子給へ反映",
];

function copyText(value: string, label: string, setCopied: (value: string) => void) {
  void navigator.clipboard?.writeText(value);
  setCopied(label);
  window.setTimeout(() => setCopied(""), 1400);
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
  const style =
    variant === "primary"
      ? "bg-[#005B55] text-white shadow-[0_18px_42px_rgba(0,91,85,0.22)] hover:bg-[#004844]"
      : "border border-slate-200 bg-white text-[#1F2933] hover:border-[#005B55] hover:text-[#005B55]";

  return (
    <a href={href} className={`${base} ${style}`}>
      {children}
      <ArrowRight className="size-4" />
    </a>
  );
}

function SectionTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C8A45D]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-[#1F2933] md:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-8 text-slate-600 md:text-base">{text}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.07)]">
      <div className="flex size-11 items-center justify-center rounded-md bg-[#EAF8F5] text-[#005B55]">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-black text-[#1F2933]">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
    </div>
  );
}

function PhonePreview() {
  return (
    <div className="mx-auto w-full max-w-[360px] rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_28px_72px_rgba(15,23,42,0.18)]">
      <div className="overflow-hidden rounded-[1.5rem] bg-[#F6F7F8]">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
          <span className="font-serif text-lg text-[#5D715B]">AromaNet</span>
          <div className="flex gap-3 text-slate-900">
            <BellRing className="size-5" />
            <MessageCircle className="size-5" />
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex gap-3">
            <div className="flex size-14 items-center justify-center rounded-full bg-[#D9F6F3] text-sm font-black text-[#005B55]">
              美咲
            </div>
            <div className="flex size-14 items-center justify-center rounded-full border-2 border-[#005B55] bg-gradient-to-br from-[#00796F] via-[#8DBB96] to-[#EAD68C]" />
          </div>
          <div className="rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between px-3 py-3">
              <div>
                <p className="font-black">美咲</p>
                <p className="text-xs text-slate-500">AromaNet Showcase 銀座</p>
              </div>
              <span className="text-xl font-black text-slate-500">...</span>
            </div>
            <div className="aspect-[4/4.6] bg-gradient-to-br from-[#007366] via-[#95D7C9] to-[#E9D78B] p-8 text-center text-white">
              <p className="mt-12 font-serif text-3xl">AromaNet</p>
              <p className="mt-3 text-xs font-bold tracking-[0.35em]">SHOWCASE</p>
              <p className="mt-20 text-3xl font-black">ON SHIFT</p>
              <p className="mt-2 text-xs">available from open slots</p>
            </div>
            <div className="flex items-center justify-between px-3 py-3">
              <div className="flex gap-4">
                <MessageCircle className="size-6" />
                <UsersRound className="size-6" />
              </div>
              <BadgeCheck className="size-6 text-[#005B55]" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["予約", "出勤", "売上"].map((label) => (
              <div key={label} className="rounded-lg bg-white p-3 text-center text-sm font-black text-[#005B55]">
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoAccountCard({
  account,
  copied,
  setCopied,
}: {
  account: (typeof demoAccounts)[number];
  copied: string;
  setCopied: (value: string) => void;
}) {
  const Icon = account.icon;

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.07)]">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#EAF8F5] text-[#005B55]">
          <Icon className="size-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-[#1F2933]">{account.role}</h3>
          <p className="text-sm text-slate-600">{account.label}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">ログインID</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <code className="min-w-0 break-all text-sm font-bold text-[#1F2933]">
              {account.id}
            </code>
            <button
              type="button"
              onClick={() => copyText(account.id, `${account.role}-id`, setCopied)}
              className="shrink-0 rounded-md border border-slate-200 bg-white p-2 text-slate-600"
              aria-label={`${account.role}のIDをコピー`}
            >
              <Copy className="size-4" />
            </button>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">共通パスワード</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <code className="min-w-0 break-all text-sm font-bold text-[#1F2933]">
              {DEMO_PASSWORD}
            </code>
            <button
              type="button"
              onClick={() => copyText(DEMO_PASSWORD, `${account.role}-pw`, setCopied)}
              className="shrink-0 rounded-md border border-slate-200 bg-white p-2 text-slate-600"
              aria-label={`${account.role}のパスワードをコピー`}
            >
              <Copy className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {account.checks.map((item) => (
          <span key={item} className="rounded-full bg-[#F6F7F8] px-3 py-1 text-xs font-bold text-slate-600">
            {item}
          </span>
        ))}
      </div>
      <a
        href={account.loginUrl}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#005B55] px-4 text-sm font-black text-white"
      >
        このアカウントでログイン
        <ArrowRight className="size-4" />
      </a>
      {copied.startsWith(account.role) ? (
        <p className="mt-2 text-center text-xs font-bold text-[#005B55]">コピーしました</p>
      ) : null}
    </div>
  );
}

export default function LandingPage() {
  const [copied, setCopied] = useState("");

  return (
    <div className="min-h-screen bg-white text-[#1F2933]">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="/" className="font-serif text-2xl text-[#5D715B]">
            AromaNet
          </a>
          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <a href="#features" className="hover:text-[#005B55]">
              機能
            </a>
            <a href="#security" className="hover:text-[#005B55]">
              緊急保護
            </a>
            <a href="#demo" className="hover:text-[#005B55]">
              デモ
            </a>
          </nav>
          <a
            href="/roles"
            className="inline-flex min-h-10 items-center rounded-md bg-[#005B55] px-4 text-sm font-black text-white"
          >
            ログイン
          </a>
        </div>
      </header>

      <main>
        <section className="overflow-hidden bg-[#F7FAF9]">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-20">
            <div>
              <p className="inline-flex rounded-md bg-[#EAF8F5] px-3 py-1 text-xs font-black tracking-[0.18em] text-[#005B55]">
                MEN'S ESTHE RESERVATION CRM
              </p>
              <h1 className="mt-5 text-4xl font-black leading-tight text-[#10201E] md:text-6xl">
                メンズエステの予約、SNS、店舗管理を1つに。
              </h1>
              <p className="mt-5 text-base leading-8 text-slate-600 md:text-lg">
                AromaNetは、店舗・セラピスト・顧客をつなぐ予約管理アプリです。
                出勤、予約、メッセージ、売上、女子給までスマホで確認できます。
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <CtaLink href="#demo">デモアカウントを見る</CtaLink>
                <CtaLink href="/roles" variant="secondary">
                  アプリを開く
                </CtaLink>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {["SMS登録", "出勤連動予約", "女子給自動反映"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <CheckCircle2 className="size-4 text-[#005B55]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <PhonePreview />
          </div>
        </section>

        <section id="features" className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle
              eyebrow="CORE FEATURES"
              title="集客から予約、売上確認まで一気通貫。"
              text="SNSの見やすさと、店舗運営に必要な管理機能を同じ画面設計にまとめています。"
            />
            <div className="mt-10 grid gap-5 md:grid-cols-4">
              {featureCards.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F6F7F8] py-16 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <SectionTitle
              eyebrow="FLOW"
              title="予約の流れがシンプルに見える。"
              text="顧客は迷わず予約、店舗は確認と担当割当、セラピストは予約と売上を確認できます。"
            />
            <ol className="space-y-3">
              {flowItems.map((item, index) => (
                <li key={item} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#005B55] text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <span className="font-bold text-[#1F2933]">{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="security" className="bg-[#062F2D] py-16 text-white md:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[0.95fr_1.05fr] md:items-center">
            <div>
              <p className="inline-flex rounded-md bg-white/10 px-3 py-1 text-xs font-black tracking-[0.18em] text-[#F2D58A]">
                EMERGENCY PROTECTION
              </p>
              <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
                緊急時に、アカウント情報を即時削除できる。
              </h2>
              <p className="mt-5 text-sm leading-8 text-white/78 md:text-base">
                通常パスワードとは別に、緊急削除用パスワードを設定できます。
                入力されると通常ログインではなく、アカウント・予約・メッセージ・投稿などの削除処理に進みます。
              </p>
              <p className="mt-3 text-xs leading-6 text-white/55">
                注意: 削除は復元できません。店舗内で運用ルールを決め、本人の意思に基づくアカウント保護機能として利用してください。
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
              <div className="rounded-xl bg-white p-5 text-[#1F2933]">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-md bg-[#FBEFD2] text-[#9B7A33]">
                    <KeyRound className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-black">クラッシュパスワード</h3>
                    <p className="text-xs font-bold text-slate-500">通常ログインとは別の緊急削除導線</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    "通常パスワードと同じ値は設定不可",
                    "平文保存せずハッシュ化",
                    "実行後は「アカウントが存在しません」画面へ",
                    "削除完了などの文言は表示しない",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-md bg-slate-50 p-3">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#005B55]" />
                      <p className="text-sm font-bold">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="demo" className="bg-[#F6F7F8] py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle
              eyebrow="DEMO ACCOUNTS"
              title="そのままログインして操作確認できます。"
              text="下のIDと共通パスワードを使って、店舗・セラピスト・顧客の3画面を確認できます。"
            />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {demoAccounts.map((account) => (
                <DemoAccountCard
                  key={account.role}
                  account={account}
                  copied={copied}
                  setCopied={setCopied}
                />
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-[#E7D7A3] bg-[#FFF9E8] p-4 text-sm leading-7 text-[#5C4A1A]">
              デモ用のため、実店舗名・実顧客情報は入れていません。配信時はこの画面からログイン情報を見せながら説明できます。
            </div>
          </div>
        </section>

        <section className="bg-white py-16 md:py-24">
          <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_62px_rgba(15,23,42,0.08)] md:p-10">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C8A45D]">
                  START
                </p>
                <h2 className="mt-3 text-3xl font-black">まずはデモで操作感を確認。</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  入口からロールを選ぶか、デモアカウント欄のログインボタンを使ってください。
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <CtaLink href="#demo">デモ情報へ</CtaLink>
                <CtaLink href="/roles" variant="secondary">
                  ロール選択へ
                </CtaLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p className="font-bold">AromaNet</p>
          <div className="flex flex-wrap gap-4">
            <a href="/terms" className="hover:text-[#005B55]">
              利用規約
            </a>
            <a href="/privacy" className="hover:text-[#005B55]">
              プライバシーポリシー
            </a>
            <a href="/contact" className="hover:text-[#005B55]">
              問い合わせ
            </a>
            <a href="/roles" className="hover:text-[#005B55]">
              ログイン
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
