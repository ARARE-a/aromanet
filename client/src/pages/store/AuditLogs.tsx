import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, ClipboardList, RefreshCw } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

const ACTION_LABELS: Record<string, string> = {
  register: "アカウント登録",
  login: "ログイン",
  "reservation.financial_adjustment": "予約の金額調整",
  "verification.review": "本人確認対応",
  "age_verification.review": "年齢確認対応",
};

function formatDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseDetail(detail?: string | null) {
  if (!detail) return null;
  try {
    return JSON.parse(detail);
  } catch {
    return detail;
  }
}

function summarizeDetail(detail: any) {
  if (!detail) return "詳細なし";
  if (typeof detail === "string") return detail;
  if (detail.next || detail.previous) {
    const before = detail.previous?.totalPrice ?? detail.previous?.total ?? detail.beforeTotal;
    const after = detail.next?.totalPrice ?? detail.next?.total ?? detail.afterTotal;
    const parts = [];
    if (before !== undefined || after !== undefined) parts.push(`金額 ${Number(before ?? 0).toLocaleString()}円 → ${Number(after ?? 0).toLocaleString()}円`);
    if (detail.next?.optionTotal !== undefined) parts.push(`追加 ${Number(detail.next.optionTotal ?? 0).toLocaleString()}円`);
    if (detail.next?.discountAmount !== undefined) parts.push(`割引 ${Number(detail.next.discountAmount ?? 0).toLocaleString()}円`);
    return parts.join(" / ") || "金額調整";
  }
  if (detail.items?.length) {
    return detail.items.map((item: any) => `${item.label || item.itemType}: ${Number(item.amount ?? 0).toLocaleString()}円`).join(" / ");
  }
  return JSON.stringify(detail);
}

export default function StoreAuditLogs() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "store")) navigate("/store/login");
  }, [session, isLoading, navigate]);

  const { data, refetch, isFetching } = trpc.store.getAuditLogs.useQuery(
    { limit: 80 },
    { enabled: !!session, refetchOnWindowFocus: true },
  );
  const logs = (data as any[]) ?? [];

  return (
    <AromaLayout title="監査ログ" showBack backHref="/store/dashboard">
      <div className="px-4 py-3">
        <div className="mb-3 rounded-2xl border border-teal-100 bg-teal-50/70 p-3 text-xs leading-relaxed text-teal-800">
          店舗アカウントで行った重要操作の履歴です。金額調整、ログイン、登録などを確認できます。
        </div>
        <Button
          variant="outline"
          className="mb-3 h-10 w-full rounded-xl"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          再読み込み
        </Button>

        {logs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">監査ログはまだありません</p>
          </div>
        ) : (
          <div className="space-y-3 pb-24">
            {logs.map((log, index) => {
              const detail = parseDetail(log.detail);
              const expanded = expandedId === log.id;
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="overflow-hidden rounded-2xl bg-white shadow-luxury"
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 p-4 text-left"
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-primary">
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </div>
                        <div className="shrink-0 text-[11px] text-muted-foreground">{formatDate(log.createdAt)}</div>
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {summarizeDetail(detail)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {log.targetType && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{log.targetType}</span>}
                        {log.targetId && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">ID: {log.targetId}</span>}
                      </div>
                    </div>
                    {expanded ? <ChevronUp className="mt-1 h-4 w-4 text-muted-foreground" /> : <ChevronDown className="mt-1 h-4 w-4 text-muted-foreground" />}
                  </button>
                  {expanded && (
                    <div className="border-t border-border/40 px-4 pb-4">
                      <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground whitespace-pre-wrap">
                        {typeof detail === "string" ? detail : JSON.stringify(detail, null, 2)}
                      </pre>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AromaLayout>
  );
}
