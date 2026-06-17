import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, User, Heart, Download, Smartphone } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { useEffect, useState } from "react";

const roles = [
  {
    id: "store",
    label: "店舗",
    sublabel: "Store",
    icon: Building2,
    description: "予約・売上・セラピスト管理",
    loginPath: "/store/login",
    dashPath: "/store/dashboard",
    color: "oklch(0.35 0.08 195)",
    bg: "bg-teal-50",
    iconBg: "bg-primary",
  },
  {
    id: "therapist",
    label: "セラピスト",
    sublabel: "Therapist",
    icon: Heart,
    description: "出勤・予約・投稿管理",
    loginPath: "/therapist/login",
    dashPath: "/therapist/dashboard",
    color: "oklch(0.55 0.12 195)",
    bg: "bg-teal-50/60",
    iconBg: "bg-teal-500",
  },
  {
    id: "customer",
    label: "お客様",
    sublabel: "Customer",
    icon: User,
    description: "検索・予約・マイページ",
    loginPath: "/customer/login",
    dashPath: "/home",
    color: "oklch(0.65 0.08 80)",
    bg: "bg-amber-50/60",
    iconBg: "bg-gold",
  },
];

export default function RoleSelect() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (!isLoading && session?.role) {
      const role = roles.find((r) => r.id === session.role);
      if (role) navigate(role.dashPath);
    }
  }, [session, isLoading]);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    if (isStandalone) { setIsInstalled(true); return; }

    // iOS detection
    const ua = navigator.userAgent;
    const iosDevice = /iphone|ipad|ipod/i.test(ua);
    setIsIOS(iosDevice);

    // Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) { setShowIOSGuide(true); return; }
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: "linear-gradient(160deg, #fff 0%, oklch(0.97 0.02 195) 100%)" }}
    >
      {/* Logo area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="mb-2 flex flex-col items-center"
      >
        {/* AromaNet gradient logo icon */}
        <div
          className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center shadow-luxury"
          style={{
            background: "linear-gradient(135deg, oklch(0.35 0.08 195) 0%, oklch(0.82 0.08 80) 100%)",
          }}
        >
          <Heart className="w-8 h-8 text-white" fill="white" />
        </div>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            background: "linear-gradient(135deg, oklch(0.35 0.08 195), oklch(0.82 0.08 80))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          AromaNet
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1 tracking-wide">
          メンズエステ予約・管理プラットフォーム
        </p>
      </motion.div>

      {/* Divider */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="w-12 h-0.5 rounded-full mb-8"
        style={{ background: "linear-gradient(90deg, oklch(0.35 0.08 195), oklch(0.82 0.08 80))" }}
      />

      {/* Role cards */}
      <div className="w-full max-w-sm space-y-3">
        {roles.map((role, i) => {
          const Icon = role.icon;
          return (
            <motion.button
              key={role.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.4, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              onClick={() => navigate(role.loginPath)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.97] group"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ background: `linear-gradient(135deg, ${role.color} 0%, ${role.color.replace("0.35", "0.55").replace("0.55", "0.70").replace("0.65", "0.75")} 100%)` }}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-[15px] text-foreground">{role.label}</span>
                  <span className="text-[11px] text-muted-foreground font-medium">{role.sublabel}</span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5">{role.description}</p>
              </div>
              <svg
                className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          );
        })}
      </div>

      {/* PWA Install button */}
      <AnimatePresence>
        {!isInstalled && (installPrompt || isIOS) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 1.0, duration: 0.4 }}
            className="mt-6 w-full max-w-sm"
          >
            <button
              onClick={handleInstall}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-dashed border-primary/40 text-primary/70 text-[13px] hover:bg-primary/5 transition-colors active:scale-[0.97]"
            >
              <Smartphone className="w-4 h-4" />
              <span>ホーム画面に追加してアプリとして使う</span>
              <Download className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
        {isInstalled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-[12px] text-primary/60 flex items-center gap-1"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>アプリとして起動中</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS install guide modal */}
      <AnimatePresence>
        {showIOSGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowIOSGuide(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl p-6 w-full max-w-sm pb-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <h3 className="text-base font-bold text-foreground mb-3 text-center">ホーム画面に追加する方法</h3>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>Safariの下部にある <strong className="text-foreground">共有ボタン（□↑）</strong> をタップ</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span>メニューから <strong className="text-foreground">「ホーム画面に追加」</strong> を選択</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span>右上の <strong className="text-foreground">「追加」</strong> をタップして完了</span>
                </li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold"
              >
                閉じる
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-6 text-[11px] text-muted-foreground text-center"
      >
        © 2024 AromaNet. All rights reserved.
      </motion.p>
    </div>
  );
}
