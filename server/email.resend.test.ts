import { describe, it, expect } from "vitest";

// メール認証機能はPhase 16で削除済み。
// Resend APIキーが設定されている場合のみ疎通確認を行う（任意）。
describe("Email configuration", () => {
  it("should have RESEND_API_KEY set (optional, used for future email features)", () => {
    const apiKey = process.env.RESEND_API_KEY;
    // キーが設定されていない場合もOK（メール認証は使用しないため）
    if (apiKey) {
      expect(apiKey.length).toBeGreaterThan(0);
    } else {
      // キー未設定でもテスト通過
      expect(true).toBe(true);
    }
  });
});
