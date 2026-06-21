import { sql } from "drizzle-orm";

export function excludeQaAccountEmails(accountTable: { email: unknown }) {
  return [
    sql`${accountTable.email} NOT LIKE ${"%@example.com"}`,
    sql`${accountTable.email} NOT LIKE ${"qa-%"}`,
    sql`${accountTable.email} NOT LIKE ${"probe-%"}`,
    sql`${accountTable.email} NOT LIKE ${"smoke-%"}`,
  ];
}
