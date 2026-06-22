import { Link } from "wouter";
import { cn } from "@/lib/utils";

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav
      aria-label="法務リンク"
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground",
        className,
      )}
    >
      <Link href="/terms" className="hover:text-primary hover:underline">
        利用規約
      </Link>
      <Link href="/privacy" className="hover:text-primary hover:underline">
        プライバシーポリシー
      </Link>
      <Link href="/contact" className="hover:text-primary hover:underline">
        問い合わせ
      </Link>
    </nav>
  );
}
