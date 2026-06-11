/**
 * Email sending helper using Resend.
 * Set RESEND_API_KEY env variable to enable email sending.
 * Without the key, verification codes are logged to console (dev mode).
 */

import { ENV } from "./env";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev mode: log to console instead of sending
    console.log(`[EMAIL DEV MODE] To: ${options.to}`);
    console.log(`[EMAIL DEV MODE] Subject: ${options.subject}`);
    console.log(`[EMAIL DEV MODE] Body: ${options.html.replace(/<[^>]+>/g, "")}`);
    return true;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const fromDomain = process.env.RESEND_FROM_EMAIL ?? "noreply@aromanet.club";

    const { error } = await resend.emails.send({
      from: `AromaNet <${fromDomain}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error("[EMAIL ERROR]", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[EMAIL SEND FAILED]", err);
    return false;
  }
}

export function buildVerificationEmail(code: string, role: "store" | "therapist" | "customer"): string {
  const roleLabel = role === "store" ? "店舗" : role === "therapist" ? "セラピスト" : "お客様";
  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #0d9488 0%, #b8960c 100%); padding: 32px 24px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px;">AromaNet</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px;">${roleLabel}アカウント メール認証</p>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        AromaNetへのご登録ありがとうございます。<br>
        以下の認証コードを入力してください。
      </p>
      <div style="background: #f0fdf4; border: 2px solid #0d9488; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
        <div style="font-size: 40px; font-weight: 800; letter-spacing: 8px; color: #0d9488; font-family: 'Courier New', monospace;">${code}</div>
        <p style="color: #666; font-size: 12px; margin: 12px 0 0;">このコードは10分間有効です</p>
      </div>
      <p style="color: #999; font-size: 12px; line-height: 1.6; margin: 0;">
        このメールに心当たりがない場合は無視してください。<br>
        このコードを他人に教えないでください。
      </p>
    </div>
    <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee;">
      <p style="color: #bbb; font-size: 11px; margin: 0;">© 2025 AromaNet. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
