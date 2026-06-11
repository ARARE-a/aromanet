import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Building2, User, Heart } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { useEffect } from "react";

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

  useEffect(() => {
    if (!isLoading && session?.role) {
      const role = roles.find((r) => r.id === session.role);
      if (role) navigate(role.dashPath);
    }
  }, [session, isLoading]);

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
        {/* Instagram-style gradient logo icon */}
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

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-10 text-[11px] text-muted-foreground text-center"
      >
        © 2024 AromaNet. All rights reserved.
      </motion.p>
    </div>
  );
}
