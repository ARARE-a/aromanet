import { Link } from "wouter";
import { ArrowLeft, ExternalLink, FileText, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { AromaLogo } from "@/components/AromaLayout";
import { Button } from "@/components/ui/button";

const updatedAt = "2026年6月22日";
const supportEmail = "support@aromanet.club";

function LegalShell({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background px-5 py-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="icon" aria-label="戻る">
            <Link href="/roles">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <AromaLogo size="sm" />
          <div className="h-10 w-10" />
        </div>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">{icon}</div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
              <p className="mt-2 text-xs text-muted-foreground">最終更新日: {updatedAt}</p>
            </div>
          </div>
          <div className="space-y-5 text-sm leading-7 text-foreground">{children}</div>
        </section>
      </div>
    </main>
  );
}

function LegalBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function TermsPage() {
  return (
    <LegalShell
      title="利用規約"
      description="AromaNetを利用する店舗、セラピスト、お客様に適用される基本ルールです。"
      icon={<FileText className="h-5 w-5" />}
    >
      <LegalBlock title="1. サービスの内容">
        <p>
          AromaNetは、店舗、セラピスト、お客様の予約、メッセージ、投稿、顧客管理、売上確認を支援する
          SNS型予約管理サービスです。実際の施術、料金、キャンセル対応、本人確認運用は、各店舗の責任で行われます。
        </p>
      </LegalBlock>

      <LegalBlock title="2. アカウント登録">
        <BulletList
          items={[
            "お客様は電話番号によるSMS認証を行い、本人が利用する電話番号で登録してください。",
            "店舗とセラピストは、虚偽の情報や第三者の情報を使って登録してはいけません。",
            "ログイン情報は本人が管理し、第三者へ共有しないでください。",
          ]}
        />
      </LegalBlock>

      <LegalBlock title="3. 予約とキャンセル">
        <BulletList
          items={[
            "予約は店舗の確認後に確定します。",
            "セラピスト指名予約は、対象セラピストの出勤予定と空き枠がある場合に受け付けます。",
            "指名無し予約は、店舗が担当セラピストを割り当てることがあります。",
            "キャンセル、無断キャンセル、遅刻の扱いは各店舗のルールに従います。",
          ]}
        />
      </LegalBlock>

      <LegalBlock title="4. 禁止事項">
        <BulletList
          items={[
            "虚偽予約、なりすまし、嫌がらせ、脅迫、差別的表現、不適切な画像や投稿の送信。",
            "外部ツールへの誘導、営業妨害、不正アクセス、データの無断取得。",
            "法律、条例、公序良俗、店舗ルールに反する行為。",
          ]}
        />
      </LegalBlock>

      <LegalBlock title="5. 投稿・メッセージ">
        <p>
          投稿、口コミ、メッセージは、通報や安全管理のため確認される場合があります。不適切と判断した内容は、
          表示制限、削除、アカウント停止の対象になります。
        </p>
      </LegalBlock>

      <LegalBlock title="6. SMS認証と通信料">
        <p>
          AromaNetは登録時の本人性確認のためSMS認証を利用します。認証SMSの送信に関する外部サービス利用料は
          原則として運営側で負担します。ただし、利用者の携帯電話契約により、SMS受信料や通信料が発生する場合があります。
        </p>
      </LegalBlock>

      <LegalBlock title="7. 免責">
        <p>
          通信障害、外部サービス障害、端末環境、店舗側の運用により、予約や通知が遅延する場合があります。
          重要な予約内容は、店舗と利用者の間で最終確認してください。
        </p>
      </LegalBlock>

      <LegalBlock title="8. 問い合わせ">
        <p>
          本規約やサービスに関する問い合わせは、問い合わせページまたは {supportEmail} までご連絡ください。
        </p>
      </LegalBlock>
    </LegalShell>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell
      title="プライバシーポリシー"
      description="AromaNetで取り扱う個人情報と利用目的をまとめています。"
      icon={<ShieldCheck className="h-5 w-5" />}
    >
      <LegalBlock title="1. 取得する情報">
        <BulletList
          items={[
            "電話番号、表示名、ログイン情報、SMS認証の結果。",
            "予約情報、来店履歴、メニュー、担当セラピスト、キャンセル履歴。",
            "メッセージ、投稿、口コミ、お気に入り、通報、ブロック情報。",
            "アップロードされた画像、動画、端末情報、アクセスログ。",
          ]}
        />
      </LegalBlock>

      <LegalBlock title="2. 利用目的">
        <BulletList
          items={[
            "アカウント登録、ログイン、SMS認証、本人性確認のため。",
            "予約管理、メッセージ、通知、顧客管理、売上・給与管理のため。",
            "不正利用、迷惑行為、トラブル防止、安全管理のため。",
            "問い合わせ対応、品質改善、障害調査のため。",
          ]}
        />
      </LegalBlock>

      <LegalBlock title="3. 第三者サービス">
        <p>
          SMS認証にはTwilio等の外部サービスを利用します。サーバー、データベース、画像保存、ログ管理にも
          外部インフラを利用する場合があります。法令に基づく場合を除き、目的外に個人情報を販売しません。
        </p>
      </LegalBlock>

      <LegalBlock title="4. 安全管理">
        <p>
          予約、電話番号、メッセージ、売上情報はロールごとの権限で管理し、必要な範囲の利用者だけが参照できるよう制御します。
          ただし、インターネット上のサービスであるため、完全な安全性を保証するものではありません。
        </p>
      </LegalBlock>

      <LegalBlock title="5. 開示・訂正・削除">
        <p>
          登録情報の確認、訂正、削除を希望する場合は、問い合わせ窓口へご連絡ください。予約履歴や監査ログなど、
          法令または安全管理上必要な情報は一定期間保持する場合があります。
        </p>
      </LegalBlock>

      <LegalBlock title="6. 問い合わせ">
        <p>個人情報の取り扱いに関する問い合わせ先: {supportEmail}</p>
      </LegalBlock>
    </LegalShell>
  );
}

export function ContactPage() {
  return (
    <LegalShell
      title="問い合わせ窓口"
      description="不具合、予約、アカウント、SMS認証、デモ導入相談はこちらから連絡してください。"
      icon={<MessageCircle className="h-5 w-5" />}
    >
      <LegalBlock title="連絡先">
        <div className="rounded-xl bg-primary/5 p-4">
          <p className="font-semibold text-foreground">AromaNetサポート</p>
          <a href={`mailto:${supportEmail}`} className="mt-1 inline-flex items-center gap-2 text-primary underline">
            <Mail className="h-4 w-4" />
            {supportEmail}
          </a>
          <p className="mt-2 text-xs text-muted-foreground">受付目安: 平日 10:00 - 18:00</p>
        </div>
      </LegalBlock>

      <LegalBlock title="問い合わせ時に入れてほしい内容">
        <BulletList
          items={[
            "利用ロール: 店舗 / セラピスト / お客様",
            "登録電話番号またはログインメールアドレス",
            "発生した画面のURL、日時、操作内容",
            "予約IDや予約日時が分かる場合はその内容",
            "スクリーンショットがある場合は添付",
          ]}
        />
      </LegalBlock>

      <LegalBlock title="SMS費用について">
        <p>
          お客様にAromaNetからSMS認証費用を個別請求する想定はありません。運営側ではTwilio Verifyの認証成功料と、
          日本向けSMS送信に関するチャネル料金が発生します。実際の金額はTwilioの契約、送信元、送信先、為替で変わります。
        </p>
        <div className="flex flex-col gap-2 text-xs">
          <a
            href="https://www.twilio.com/en-us/verify/pricing"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary underline"
          >
            Twilio Verify pricing
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://www.twilio.com/en-us/sms/pricing/jp"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary underline"
          >
            Twilio Japan SMS pricing
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </LegalBlock>

      <LegalBlock title="緊急時">
        <p>
          迷惑行為、なりすまし、不適切なメッセージは、アプリ内の通報・ブロック導線も利用してください。
          生命・身体に関わる緊急事態は、サービス内の問い合わせではなく警察・救急等の公的窓口へ連絡してください。
        </p>
      </LegalBlock>
    </LegalShell>
  );
}
