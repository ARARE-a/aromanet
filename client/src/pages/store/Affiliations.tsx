import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Ban, CheckCircle, Clock, Copy, Link2, Plus, UserPlus, Users, XCircle } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function StoreAffiliations() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [rejectNote, setRejectNote] = useState("");
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!isLoading && (!session || session.role !== "store")) navigate("/store/login");
  }, [session, isLoading]);

  const { data: requests } = trpc.affiliation.getStoreRequests.useQuery({ status: undefined }, { enabled: !!session });
  const { data: inviteLinks } = trpc.affiliation.getInviteLinks.useQuery(undefined, { enabled: !!session });
  const allReqs = (requests as any[]) ?? [];
  const links = (inviteLinks as any[]) ?? [];
  const pendingReqs = allReqs.filter(r => r.status === "pending");
  const processedReqs = allReqs.filter(r => r.status !== "pending");

  const inviteUrl = (token: string) => `${window.location.origin}/therapist/register?invite=${encodeURIComponent(token)}`;

  const copyInviteUrl = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast.success("招待URLをコピーしました");
    } catch {
      toast.error("コピーに失敗しました。URL欄を長押ししてコピーしてください");
    }
  };

  const createInviteMut = trpc.affiliation.createInviteLink.useMutation({
    onSuccess: async (data) => {
      await utils.affiliation.getInviteLinks.invalidate();
      await copyInviteUrl(data.token);
    },
    onError: e => toast.error(e.message),
  });

  const deactivateInviteMut = trpc.affiliation.deactivateInviteLink.useMutation({
    onSuccess: () => {
      utils.affiliation.getInviteLinks.invalidate();
      toast.success("招待URLを無効化しました");
    },
    onError: e => toast.error(e.message),
  });

  const respondMut = trpc.affiliation.respond.useMutation({
    onSuccess: (_, vars) => {
      utils.affiliation.getStoreRequests.invalidate();
      toast.success(vars.action === "approved" ? "承認しました" : "却下しました");
      setSelectedReq(null);
      setRejectNote("");
    },
    onError: e => toast.error(e.message),
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-amber-100 text-amber-700 border-0"><Clock className="w-3 h-3 mr-1" />審査中</Badge>;
      case "approved": return <Badge className="bg-teal-100 text-teal-700 border-0"><CheckCircle className="w-3 h-3 mr-1" />承認済み</Badge>;
      case "rejected": return <Badge className="bg-red-100 text-red-700 border-0"><XCircle className="w-3 h-3 mr-1" />却下</Badge>;
      default: return null;
    }
  };

  return (
    <AromaLayout title="所属申請管理" showBack backHref="/store/dashboard">
      <div className="px-4 py-3">
        <div className="bg-white rounded-2xl p-3 shadow-luxury flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">申請中: {pendingReqs.length}件</div>
            <div className="text-xs text-muted-foreground">セラピストからの所属申請を承認・却下できます</div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="bg-white rounded-2xl p-4 shadow-luxury space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">セラピスト招待URL</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                このURLから登録したセラピストは、自動でこの店舗の所属になります。
              </div>
            </div>
            <Button
              size="sm"
              className="h-9 rounded-xl text-white bg-primary hover:bg-primary/90 shrink-0"
              onClick={() => createInviteMut.mutate({ label: "セラピスト招待" })}
              disabled={createInviteMut.isPending}
            >
              <Plus className="w-4 h-4 mr-1" />発行
            </Button>
          </div>

          {links.length === 0 ? (
            <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
              まだ招待URLはありません。「発行」を押すとURLを作成してコピーします。
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link: any) => (
                <div key={link.id} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={link.isActive ? "bg-teal-100 text-teal-700 border-0" : "bg-muted text-muted-foreground border-0"}>
                      {link.isActive ? "有効" : "無効"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">利用 {link.usedCount ?? 0}回</span>
                  </div>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteUrl(link.token)} className="h-9 rounded-xl text-xs" />
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={() => copyInviteUrl(link.token)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    {link.isActive && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl shrink-0 text-red-500 border-red-200"
                        onClick={() => deactivateInviteMut.mutate({ id: link.id })}
                        disabled={deactivateInviteMut.isPending}
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="pending" className="px-4">
        <TabsList className="w-full rounded-xl mb-3">
          <TabsTrigger value="pending" className="flex-1 rounded-lg">
            審査中 {pendingReqs.length > 0 && <span className="ml-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{pendingReqs.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="processed" className="flex-1 rounded-lg">処理済み</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 pb-24">
          {pendingReqs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">審査中の申請はありません</p>
            </div>
          ) : (
            pendingReqs.map((req: any, i: number) => (
              <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-luxury">
                <div className="flex items-center gap-3 mb-3">
                  <AromaAvatar name={req.therapistName} src={req.therapistImage} size="md" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-foreground">{req.therapistName ?? "セラピスト"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString("ja-JP")}</div>
                  </div>
                  {statusBadge(req.status)}
                </div>
                {req.message && (
                  <div className="bg-muted/30 rounded-xl p-3 mb-3">
                    <p className="text-xs text-foreground">{req.message}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-9 rounded-xl bg-teal-500 hover:bg-teal-600 text-white"
                    onClick={() => respondMut.mutate({ requestId: req.id, action: "approved" })}
                    disabled={respondMut.isPending}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />承認
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-9 rounded-xl border-red-200 text-red-500"
                    onClick={() => setSelectedReq(req)}>
                    <XCircle className="w-3.5 h-3.5 mr-1" />却下
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-3 pb-24">
          {processedReqs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">処理済みの申請はありません</p>
            </div>
          ) : (
            processedReqs.map((req: any, i: number) => (
              <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-luxury">
                <div className="flex items-center gap-3">
                  <AromaAvatar name={req.therapistName} src={req.therapistImage} size="md" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-foreground">{req.therapistName ?? "セラピスト"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString("ja-JP")}</div>
                  </div>
                  {statusBadge(req.status)}
                </div>
                {req.storeNote && (
                  <div className="mt-2 text-xs text-muted-foreground">備考: {req.storeNote}</div>
                )}
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Reject dialog */}
      <Dialog open={!!selectedReq} onOpenChange={(open) => { if (!open) { setSelectedReq(null); setRejectNote(""); } }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>申請を却下</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{selectedReq?.therapistName}</span> さんの申請を却下します。
            </p>
            <div>
              <label className="text-sm font-medium">却下理由（任意）</label>
              <Textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} className="mt-1 rounded-xl resize-none" rows={3} placeholder="セラピストへのメッセージ..." />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setSelectedReq(null); setRejectNote(""); }}>キャンセル</Button>
              <Button className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white"
                onClick={() => respondMut.mutate({ requestId: selectedReq.id, action: "rejected", responseNote: rejectNote })}
                disabled={respondMut.isPending}>
                却下する
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AromaLayout>
  );
}
