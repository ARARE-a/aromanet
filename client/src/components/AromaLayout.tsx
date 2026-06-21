import React from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AromaLayoutProps {
  children: React.ReactNode;
  title?: string;
  titleLogo?: boolean;
  showBack?: boolean;
  backHref?: string;
  showNav?: boolean;
  navItems?: { href: string; icon: React.ReactNode; activeIcon?: React.ReactNode; label: string }[];
  headerRight?: React.ReactNode;
  headerLeft?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function AromaLayout({
  children,
  title,
  titleLogo = false,
  showBack = false,
  backHref,
  showNav = false,
  navItems = [],
  headerRight,
  headerLeft,
  className,
  noPadding = false,
}: AromaLayoutProps) {
  const [, navigate] = useLocation();
  const hasHeader = title || titleLogo || showBack || headerRight || headerLeft;

  return (
    <div className="min-h-[100dvh] max-h-[100dvh] bg-background flex flex-col relative overflow-hidden">
      {hasHeader && (
        <header className="flex-shrink-0 sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-3 h-[44px] flex items-center gap-2">
          {headerLeft && <div className="flex items-center">{headerLeft}</div>}
          {showBack && !headerLeft && (
            <button
              onClick={() => backHref ? navigate(backHref) : history.back()}
              className="p-1.5 -ml-1.5 rounded-full active:bg-gray-100 transition-colors"
              aria-label="戻る"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
          )}
          <div className="flex-1 flex items-center min-w-0">
            {titleLogo ? (
              <AromaLogo size="sm" />
            ) : title ? (
              <h1
                className="text-[15px] font-semibold text-foreground tracking-tight truncate"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {title}
              </h1>
            ) : null}
          </div>
          {headerRight && <div className="flex items-center gap-1 ml-auto">{headerRight}</div>}
        </header>
      )}

      <main className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden w-full",
        !noPadding && showNav && navItems.length > 0 ? "pb-[calc(49px+env(safe-area-inset-bottom))]" : "",
        className,
      )}>
        {children}
      </main>

      {showNav && navItems.length > 0 && (
        <nav
          className="flex-shrink-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-40"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex items-center justify-around h-[49px]">
            {navItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

function NavItem({ href, icon, activeIcon, label }: { href: string; icon: React.ReactNode; activeIcon?: React.ReactNode; label: string }) {
  const [location] = useLocation();
  const isActive = location === href || (href !== "/" && location.startsWith(href));
  return (
    <Link href={href}>
      <div
        className="flex flex-col items-center justify-center gap-[2px] w-[60px] h-full cursor-pointer active:scale-90 transition-transform duration-100"
        aria-label={label}
      >
        <div className={cn(
          "w-6 h-6 flex items-center justify-center transition-all duration-150",
          isActive ? "text-foreground scale-110" : "text-gray-400",
        )}>
          {isActive && activeIcon ? activeIcon : icon}
        </div>
      </div>
    </Link>
  );
}

export function AromaLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-xl", md: "text-2xl", lg: "text-3xl" };
  return (
    <div
      className={cn("font-bold tracking-tight leading-none", sizes[size])}
      style={{
        fontFamily: "'Cormorant Garamond', serif",
        background: "linear-gradient(135deg, oklch(0.35 0.08 195), oklch(0.82 0.08 80))",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      AromaNet
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    pending: { label: "確認待ち", className: "bg-amber-50 text-amber-700 border-amber-200" },
    confirmed: { label: "確定", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    waiting: { label: "来店待ち", className: "bg-sky-50 text-sky-700 border-sky-200" },
    in_service: { label: "施術中", className: "bg-violet-50 text-violet-700 border-violet-200" },
    completed: { label: "完了", className: "bg-gray-50 text-gray-600 border-gray-200" },
    cancelled: { label: "キャンセル", className: "bg-red-50 text-red-600 border-red-200" },
    no_show: { label: "無断キャンセル", className: "bg-red-100 text-red-800 border-red-300" },
    change_requested: { label: "変更依頼", className: "bg-orange-50 text-orange-700 border-orange-200" },
  };
  const config = configs[status] ?? { label: status, className: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border", config.className)}>
      {config.label}
    </span>
  );
}

export function LevelBadge({ level }: { level: number }) {
  const colors: Record<number, string> = {
    1: "#CD7F32",
    2: "#C0C0C0",
    3: "#FFD700",
    4: "#E5E4E2",
    5: "#B9F2FF",
    6: "#1a1a1a",
    7: "#8B0000",
    8: "#50C878",
    9: "#0F52BA",
    10: "#9400D3",
  };
  const names: Record<number, string> = {
    1: "ブロンズ",
    2: "シルバー",
    3: "ゴールド",
    4: "プラチナ",
    5: "ダイヤ",
    6: "ブラック",
    7: "ロイヤル",
    8: "エメラルド",
    9: "サファイア",
    10: "レジェンド",
  };
  const safeLevel = Math.min(10, Math.max(1, level));
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border"
      style={{
        borderColor: colors[safeLevel],
        color: safeLevel === 6 ? "#fff" : colors[safeLevel],
        backgroundColor: safeLevel === 6 ? "#1a1a1a" : `${colors[safeLevel]}20`,
      }}
    >
      Lv.{safeLevel} {names[safeLevel]}
    </span>
  );
}

export function AromaAvatar({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const [imgError, setImgError] = React.useState(false);
  React.useEffect(() => { setImgError(false); }, [src]);
  const sizes = {
    xs: "w-6 h-6 text-[9px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-20 h-20 text-xl",
  };
  const initials = name ? name.slice(0, 2) : "?";
  const showImage = src && !imgError;
  return (
    <div className={cn(
      "rounded-full overflow-hidden bg-teal-muted flex items-center justify-center font-semibold text-primary flex-shrink-0",
      sizes[size],
      className,
    )}>
      {showImage
        ? <img src={src} alt={name ?? ""} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        : <span>{initials}</span>}
    </div>
  );
}

export function StoryAvatar({
  src,
  name,
  size = "md",
  hasStory = false,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  hasStory?: boolean;
  className?: string;
}) {
  const [imgError, setImgError] = React.useState(false);
  React.useEffect(() => { setImgError(false); }, [src]);
  const outerSizes = { sm: "w-10 h-10", md: "w-14 h-14", lg: "w-18 h-18", xl: "w-24 h-24" };
  const innerSizes = { sm: "w-8 h-8 text-xs", md: "w-12 h-12 text-sm", lg: "w-16 h-16 text-base", xl: "w-22 h-22 text-xl" };
  const initials = name ? name.slice(0, 2) : "?";
  const showImage = src && !imgError;
  return (
    <div className={cn("relative flex items-center justify-center", outerSizes[size], className)}>
      {hasStory && (
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "linear-gradient(45deg, var(--color-teal), var(--color-teal-light), var(--color-gold))", padding: "2px" }}
        >
          <div className="w-full h-full rounded-full bg-white" />
        </div>
      )}
      <div className={cn(
        "rounded-full overflow-hidden bg-teal-muted flex items-center justify-center font-semibold text-primary relative z-10",
        innerSizes[size],
        hasStory ? "ring-2 ring-white" : "",
      )}>
        {showImage
          ? <img src={src} alt={name ?? ""} className="w-full h-full object-cover" onError={() => setImgError(true)} />
          : <span>{initials}</span>}
      </div>
    </div>
  );
}

export function SectionDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex-1 h-px bg-gray-100" />
      {label && <span className="text-[11px] text-gray-400 font-medium">{label}</span>}
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}
