import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Star, Trophy, TrendingUp } from "lucide-react";
import { AromaLayout, LevelBadge } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Progress } from "@/components/ui/progress";

const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0, 2: 10000, 3: 30000, 4: 60000, 5: 100000,
  6: 150000, 7: 220000, 8: 300000, 9: 400000, 10: 500000,
};

const LEVEL_BENEFITS: Record<number, string[]> = {
  1: ["基本サービス利用可"],
  2: ["誕生日特典 500円OFF"],
  3: ["指名料 10%OFF", "誕生日特典 1,000円OFF"],
  4: ["指名料 15%OFF", "優先予約枠", "誕生日特典 2,000円OFF"],
  5: ["指名料 20%OFF", "優先予約枠", "専用クーポン毎月1枚"],
  6: ["指名料 25%OFF", "VIP優先予約", "専用クーポン毎月2枚"],
  7: ["指名料 30%OFF", "VIP優先予約", "専用クーポン毎月3枚", "限定セラピスト指名可"],
  8: ["指名料 35%OFF", "プレミアム優先予約", "専用クーポン毎月4枚", "限定セラピスト指名可"],
  9: ["指名料 40%OFF", "最優先予約", "専用クーポン毎月5枚", "プレミアムコース割引"],
  10: ["指名料 50%OFF", "最優先予約", "無制限クーポン", "全コース割引", "専属担当制"],
};

export default function CustomerLevel() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  useEffect(() => { if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login"); }, [session, isLoading]);
  const { data: profile } = trpc.customer.getMyProfile.useQuery(undefined, { enabled: !!session });
  const p = profile as any;
  const level = p?.memberLevel ?? 1;
  const totalSpent = p?.totalSpent ?? 0;
  const currentThreshold = LEVEL_THRESHOLDS[level] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level + 1];
  const progress = nextThreshold
    ? Math.min(100, ((totalSpent - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
    : 100;

  return (
    <AromaLayout title="会員レベル" showBack backHref="/my/page">
      <div className="px-4 py-6 space-y-5">
        {/* Current level */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 shadow-luxury text-center">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-gold" />
          <LevelBadge level={level} />
          <div className="mt-3 text-2xl font-bold text-foreground" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Lv.{level}
          </div>
          <div className="text-sm text-muted-foreground mt-1">累計利用金額: ¥{totalSpent.toLocaleString()}</div>
          {nextThreshold && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>現在</span>
                <span>次のレベルまで ¥{(nextThreshold - totalSpent).toLocaleString()}</span>
              </div>
              <Progress value={progress} className="h-2 rounded-full" />
              <div className="text-xs text-muted-foreground mt-1">¥{nextThreshold.toLocaleString()} でLv.{level + 1}へ</div>
            </div>
          )}
          {!nextThreshold && (
            <div className="mt-3 text-sm font-semibold text-gold">最高レベル達成！</div>
          )}
        </motion.div>

        {/* Current benefits */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 shadow-luxury">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-gold" />
            <span className="text-sm font-semibold text-foreground">現在の特典</span>
          </div>
          <div className="space-y-1.5">
            {(LEVEL_BENEFITS[level] ?? []).map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                {b}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Level chart */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 shadow-luxury">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">レベル一覧</span>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(lv => (
              <div key={lv} className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${lv === level ? "bg-teal-muted" : lv < level ? "opacity-60" : ""}`}>
                <LevelBadge level={lv} />
                <div className="flex-1 text-xs text-muted-foreground">
                  ¥{(LEVEL_THRESHOLDS[lv] ?? 0).toLocaleString()}〜
                </div>
                {lv === level && <span className="text-xs text-primary font-semibold">現在</span>}
                {lv < level && <span className="text-xs text-muted-foreground">達成済</span>}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AromaLayout>
  );
}
