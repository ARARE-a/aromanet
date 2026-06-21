import { sql } from "drizzle-orm";

export function excludeQaAccountEmails(accountTable: { email: unknown }) {
  return [
    sql`${accountTable.email} NOT LIKE ${"qa-%@example.com"}`,
    sql`${accountTable.email} NOT LIKE ${"probe-%@example.com"}`,
  ];
}
