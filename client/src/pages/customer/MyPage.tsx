import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { User, Heart, Calendar, Star, Shield, LogOut, ChevronRight } from "lucide-react";
import { AromaLayout, AromaAvatar, LevelBadge } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";

export default function CustomerMyPage() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const logoutMut = trpc.aroAuth.aroLogout.useMutation({ onSuccess: () => navigate("/") });
  useEffect(() => { if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login"); }, [session, isLoading]);
  const { data: profile } = trpc.customer.getMyProfile.useQuery(undefined, { enabled: !!session });
  const p = profile as any;

  const menuItems = [
    { icon: <Calendar className="w-4 h-4" />, label: "予約履歴", href: "/my/reservations" },
    { icon: <Heart className="w-4 h-4" />, label: "お気に入り", href: "/my/favorites" },
    { icon: <Star className="w-4 h-4" />, label: "会員レベル", href: "/my/level" },
    { icon: <Shield className="w-4 h-4" />, label: "本人確認", href: "/my/verification" },
    { icon: <User className="w-4 h-4" />, label: "プロフィール編集", href: "/my/edit" },
  ];

  return (
    <AromaLayout title="マイページ">
      <div className="px-4 py-6 space-y-5">
        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 shadow-luxury flex items-center gap-4">
          <AromaAvatar name={p?.nickname} src={p?.avatarUrl} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground text-base">{p?.nickname ?? "ゲスト"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">累計利用: ¥{(p?.totalSpent ?? 0).toLocaleString()}</div>
            {p?.memberLevel && <div className="mt-1"><LevelBadge level={p.memberLevel} /></div>}
          </div>
        </motion.div>

        {/* Menu */}
        <div className="space-y-2">
          {menuItems.map((item, i) => (
            <motion.button key={item.href} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => navigate(item.href)}
              className="w-full bg-white rounded-2xl px-4 py-3.5 shadow-luxury flex items-center gap-3 hover:shadow-md transition-shadow text-left">
              <span className="w-8 h-8 rounded-xl bg-teal-muted flex items-center justify-center text-primary flex-shrink-0">{item.icon}</span>
              <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          ))}
        </div>

        {/* Logout */}
        <Button variant="outline" className="w-full rounded-xl h-11 text-red-500 border-red-200 hover:bg-red-50"
          onClick={() => logoutMut.mutate()}>
          <LogOut className="w-4 h-4 mr-2" />ログアウト
        </Button>
      </div>
    </AromaLayout>
  );
}
