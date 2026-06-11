import { describe, it, expect } from "vitest";
import { Resend } from "resend";

describe("Resend API key validation", () => {
  it("should connect to Resend API with the provided key", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey, "RESEND_API_KEY must be set").toBeTruthy();
    expect(apiKey!.startsWith("re_"), "Key should start with re_").toBe(true);

    // Validate by listing domains (lightweight call, no email sent)
    const resend = new Resend(apiKey);
    const { data, error } = await resend.domains.list();
    expect(error, `Resend API error: ${JSON.stringify(error)}`).toBeNull();
    expect(data).toBeDefined();
  });
});
