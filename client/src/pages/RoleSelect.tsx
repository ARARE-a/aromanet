import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Building2, User, Heart } from "lucide-react";
import { AromaLogo } from "@/components/AromaLayout";
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
    gradient: "from-[oklch(0.35_0.08_195)] to-[oklch(0.45_0.10_195)]",
    accent: "border-[oklch(0.35_0.08_195)]",
  },
  {
    id: "therapist",
    label: "セラピスト",
    sublabel: "Therapist",
    icon: Heart,
    description: "出勤・予約・投稿管理",
    loginPath: "/therapist/login",
    dashPath: "/therapist/dashboard",
    gradient: "from-[oklch(0.55_0.12_195)] to-[oklch(0.65_0.10_195)]",
    accent: "border-[oklch(0.55_0.12_195)]",
  },
  {
    id: "customer",
    label: "お客様",
    sublabel: "Customer",
    icon: User,
    description: "検索・予約・マイページ",
    loginPath: "/customer/login",
    dashPath: "/home",
    gradient: "from-[oklch(0.82_0.08_80)] to-[oklch(0.75_0.10_80)]",
    accent: "border-[oklch(0.82_0.08_80)]",
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="mb-2"
      >
        <AromaLogo size="lg" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-muted-foreground text-sm mb-10 text-center"
      >
        メンズエステ予約・管理プラットフォーム
      </motion.p>
      <div className="w-full space-y-3">
        {roles.map((role, i) => {
          const Icon = role.icon;
          return (
            <motion.button
              key={role.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i + 0.3, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              onClick={() => navigate(role.loginPath)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 ${role.accent} bg-white shadow-luxury hover:shadow-md transition-all duration-200 active:scale-[0.98] group`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-foreground text-base">{role.label}</span>
                  <span className="text-xs text-muted-foreground">{role.sublabel}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
              </div>
              <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          );
        })}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 text-xs text-muted-foreground text-center"
      >
        © 2024 AromaNet. All rights reserved.
      </motion.p>
    </div>
  );
}
