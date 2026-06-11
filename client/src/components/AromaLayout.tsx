import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Bell, MessageCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

interface AromaLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  backHref?: string;
  showNav?: boolean;
  navItems?: { href: string; icon: React.ReactNode; label: string }[];
  headerRight?: React.ReactNode;
  className?: string;
}

export function AromaLayout({
  children,
  title,
  showBack = false,
  backHref,
  showNav = false,
  navItems = [],
  headerRight,
  className,
}: AromaLayoutProps) {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      {(title || showBack || headerRight) && (
        <header className="sticky top-0 z-40 glass border-b border-border/50 px-4 py-3 flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => backHref ? navigate(backHref) : history.back()}
              className="p-1 -ml-1 rounded-full hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-charcoal" />
            </button>
          )}
          {title && (
            <h1 className="flex-1 text-base font-semibold text-foreground truncate"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {title}
            </h1>
          )}
          {headerRight && <div className="ml-auto">{headerRight}</div>}
        </header>
      )}

      {/* Main content */}
      <main className={cn("flex-1 pb-20", className)}>
        {children}
      </main>

      {/* Bottom nav */}
      {showNav && navItems.length > 0 && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 glass border-t border-border/50">
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const [location] = useLocation();
  const isActive = location === href || location.startsWith(href + "/");
  return (
    <Link href={href}>
      <div className={cn(
        "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}>
        <div className={cn("w-6 h-6", isActive && "scale-110 transition-transform")}>{icon}</div>
        <span className="text-[10px] font-medium">{label}</span>
      </div>
    </Link>
  );
}

// Logo component
export function AromaLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" };
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "font-bold tracking-tight",
        sizes[size],
        "bg-gradient-to-r from-[oklch(0.35_0.08_195)] to-[oklch(0.82_0.08_80)] bg-clip-text text-transparent"
      )} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        AromaNet
      </div>
    </div>
  );
}

// Status badge component
export function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    pending: { label: "確認待ち", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    confirmed: { label: "確定", className: "bg-green-100 text-green-800 border-green-200" },
    waiting: { label: "待機中", className: "bg-blue-100 text-blue-800 border-blue-200" },
    in_service: { label: "施術中", className: "bg-purple-100 text-purple-800 border-purple-200" },
    completed: { label: "完了", className: "bg-gray-100 text-gray-700 border-gray-200" },
    cancelled: { label: "キャンセル", className: "bg-red-100 text-red-700 border-red-200" },
    no_show: { label: "無断キャンセル", className: "bg-red-200 text-red-900 border-red-300" },
    change_requested: { label: "変更申請", className: "bg-orange-100 text-orange-800 border-orange-200" },
  };
  const config = configs[status] ?? { label: status, className: "bg-gray-100 text-gray-700 border-gray-200" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", config.className)}>
      {config.label}
    </span>
  );
}

// Level badge
export function LevelBadge({ level }: { level: number }) {
  const colors: Record<number, string> = {
    1: "#CD7F32", 2: "#C0C0C0", 3: "#FFD700", 4: "#E5E4E2",
    5: "#B9F2FF", 6: "#1a1a1a", 7: "#8B0000", 8: "#50C878",
    9: "#0F52BA", 10: "#9400D3",
  };
  const names: Record<number, string> = {
    1: "ブロンズ", 2: "シルバー", 3: "ゴールド", 4: "プラチナ",
    5: "ダイヤ", 6: "ブラック", 7: "ロイヤル", 8: "エメラルド",
    9: "サファイア", 10: "レジェンド",
  };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border"
      style={{ borderColor: colors[level], color: level === 6 ? "#fff" : colors[level], backgroundColor: level === 6 ? "#1a1a1a" : `${colors[level]}20` }}
    >
      Lv.{level} {names[level]}
    </span>
  );
}

// Avatar component
export function AromaAvatar({ src, name, size = "md", className }: { src?: string | null; name?: string | null; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-base", xl: "w-20 h-20 text-xl" };
  const initials = name ? name.slice(0, 2) : "?";
  return (
    <div className={cn("rounded-full overflow-hidden bg-teal-muted flex items-center justify-center font-semibold text-primary flex-shrink-0", sizes[size], className)}>
      {src ? <img src={src} alt={name ?? ""} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}
