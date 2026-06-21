import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronLeft, MessageCircle, MoreVertical, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AromaAvatar, AromaLayout } from "@/components/AromaLayout";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

const QUICK_REPLIES = [
  "ご予約ありがとうございます。",
  "本日のご来店をお待ちしております。",
  "ご不明な点はお気軽にご連絡ください。",
  "またのご来店をお待ちしております。",
];

export default function Messages() {
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const { session, isLoading } = useSession();
  const [selectedThread, setSelectedThread] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [autoOpenDone, setAutoOpenDone] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !session) navigate("/");
  }, [session, isLoading, navigate]);

  const { data: threads, refetch: refetchThreads } = trpc.message.getThreads.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const { data: messages, refetch: refetchMessages } = trpc.message.getMessages.useQuery(
    { threadId: selectedThread! },
    {
      enabled: !!session && !!selectedThread,
      refetchInterval: 3000,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
    },
  );
  const handleMessageError = (error: { message?: string }) => {
    const nextMessage = error.message || "メッセージの操作に失敗しました。";
    if (nextMessage.includes("年齢確認")) {
      toast.error(nextMessage, {
        action: { label: "本人確認", onClick: () => navigate("/my/verification") },
      });
      return;
    }
    toast.error(nextMessage);
  };

  const getOrCreateThreadMut = trpc.message.getOrCreateThread.useMutation({
    onSuccess: (thread: any) => {
      setSelectedThread(thread.id);
      refetchThreads();
    },
    onError: handleMessageError,
  });

  useEffect(() => {
    if (!session || autoOpenDone || !searchStr) return;
    const params = new URLSearchParams(searchStr);
    const therapistId = params.get("therapistId");
    const storeId = params.get("storeId");
    const customerId = params.get("customerId");
    const type = params.get("type");

    if (type === "store_therapist" && therapistId && storeId && session.role === "store") {
      setAutoOpenDone(true);
      getOrCreateThreadMut.mutate({ threadType: "store_therapist", storeId: parseInt(storeId, 10), therapistId: parseInt(therapistId, 10) });
    } else if (type === "store_customer" && customerId && storeId && session.role === "store") {
      setAutoOpenDone(true);
      getOrCreateThreadMut.mutate({ threadType: "store_customer", storeId: parseInt(storeId, 10), customerId: parseInt(customerId, 10) });
    } else if (type === "store_therapist" && storeId && session.role === "therapist") {
      setAutoOpenDone(true);
      getOrCreateThreadMut.mutate({ threadType: "store_therapist", storeId: parseInt(storeId, 10), therapistId: session.therapistId ?? undefined });
    } else if (therapistId && session.role === "customer") {
      setAutoOpenDone(true);
      getOrCreateThreadMut.mutate({ threadType: "therapist_customer", therapistId: parseInt(therapistId, 10), customerId: session.accountId ?? undefined });
    } else if (storeId && session.role === "customer") {
      setAutoOpenDone(true);
      getOrCreateThreadMut.mutate({ threadType: "store_customer", storeId: parseInt(storeId, 10), customerId: session.accountId ?? undefined });
    }
  }, [session, searchStr, autoOpenDone, getOrCreateThreadMut]);

  const sendMut = trpc.message.send.useMutation({
    onSuccess: () => {
      setMessage("");
      refetchMessages();
      refetchThreads();
    },
    onError: handleMessageError,
  });

  const reportMut = trpc.message.reportMessage.useMutation({
    onSuccess: () => toast.success("通報しました。"),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = trpc.message.deleteMessage.useMutation({
    onSuccess: () => {
      toast.success("メッセージを削除しました。");
      refetchMessages();
      refetchThreads();
    },
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedThread && messages) refetchThreads();
  }, [selectedThread, messages, refetchThreads]);

  const threadList = (threads as any[]) ?? [];
  const messageList = (messages as any[]) ?? [];
  const currentThread = threadList.find((t: any) => t.id === selectedThread);
  const readByReplyIds = new Set<number>();
  let hasLaterIncomingMessage = false;
  for (const msg of [...messageList].reverse()) {
    const isMe = msg.senderRole === session?.role;
    if (isMe && hasLaterIncomingMessage) readByReplyIds.add(msg.id);
    if (!isMe) hasLaterIncomingMessage = true;
  }

  const handleSend = () => {
    if (!message.trim() || !selectedThread) return;
    sendMut.mutate({ threadId: selectedThread, content: message.trim() });
  };

  const reportLatestMessage = () => {
    const latest = [...messageList].reverse().find((m: any) => m.senderRole !== session?.role) ?? messageList[messageList.length - 1];
    if (!latest?.id) {
      toast.error("通報できるメッセージがありません。");
      return;
    }
    reportMut.mutate({ messageId: latest.id, reason: "不適切なメッセージ" });
  };

  if (selectedThread) {
    return (
      <div className="min-h-[100dvh] max-h-[100dvh] bg-background flex flex-col overflow-hidden">
        <header className="sticky top-0 z-40 glass border-b border-border/50 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSelectedThread(null)} className="p-1 -ml-1 rounded-full active:bg-muted transition-colors" aria-label="戻る">
            <ChevronLeft className="w-5 h-5 text-charcoal" />
          </button>
          <AromaAvatar name={currentThread?.otherName} src={currentThread?.otherAvatar} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{currentThread?.otherName}</div>
            <div className="text-xs text-muted-foreground">{roleLabel(currentThread?.otherRole)}</div>
          </div>
          <button onClick={reportLatestMessage} className="p-2 rounded-full active:bg-muted transition-colors" aria-label="通報">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-32">
          {messageList.map((msg: any) => {
            const isMe = msg.senderRole === session?.role;
            const isRead = Boolean(msg.isRead || readByReplyIds.has(msg.id));
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2`}>
                {!isMe && <AromaAvatar name={currentThread?.otherName} size="sm" />}
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${isMe ? "bg-primary text-white rounded-br-sm" : "bg-white shadow-luxury text-foreground rounded-bl-sm"}`}>
                    {msg.imageUrl && <img src={msg.imageUrl} alt="" className="w-full rounded-lg mb-1 max-w-[200px]" />}
                    {msg.content}
                  </div>
                  <div className={`flex items-center gap-1 ${isMe ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] text-muted-foreground px-1">
                      {msg.createdAt ? format(new Date(msg.createdAt), "HH:mm") : ""}
                      {isMe && (isRead ? " 既読" : " 未読")}
                    </span>
                    <MessageMenu
                      isMe={isMe}
                      onDeleteMe={() => deleteMut.mutate({ messageId: msg.id, mode: "me" })}
                      onDeleteEveryone={() => deleteMut.mutate({ messageId: msg.id, mode: "everyone" })}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="fixed bottom-16 left-0 right-0 px-4 pb-1" style={{ maxWidth: "430px", margin: "0 auto" }}>
          <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
            {QUICK_REPLIES.map(q => (
              <button key={q} onClick={() => setMessage(q)} className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-white shadow-luxury text-muted-foreground active:text-primary border border-border/50 transition-colors">
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 glass border-t border-border/50 px-4 py-3 flex items-center gap-2" style={{ maxWidth: "430px", margin: "0 auto" }}>
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="メッセージを入力"
            className="flex-1 rounded-xl h-9"
          />
          <Button size="sm" className="w-9 h-9 rounded-xl gradient-luxury text-white p-0 flex-shrink-0" onClick={handleSend} disabled={!message.trim() || sendMut.isPending} aria-label="送信">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AromaLayout title="メッセージ" showBack backHref={session?.role === "customer" ? "/home" : undefined}>
      <div className="px-4 py-3 space-y-2">
        {threadList.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">メッセージはまだありません</p>
          </div>
        ) : threadList.map((thread: any, i: number) => (
          <motion.div key={thread.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <button onClick={() => setSelectedThread(thread.id)} className="w-full bg-white rounded-2xl p-4 shadow-luxury flex items-center gap-3 active:scale-[0.99] transition-transform text-left">
              <div className="relative">
                <AromaAvatar name={thread.otherName} src={thread.otherAvatar} size="md" />
                {thread.unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{thread.otherName}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{thread.lastMessageAt ? format(new Date(thread.lastMessageAt), "MM/dd HH:mm") : ""}</span>
                </div>
                {thread.contextLabel && (
                  <div className="text-[10px] text-primary font-medium truncate mt-0.5">{thread.contextLabel}</div>
                )}
                <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.lastMessage ?? "メッセージはまだありません"}</p>
              </div>
            </button>
          </motion.div>
        ))}
      </div>
    </AromaLayout>
  );
}

function MessageMenu({ isMe, onDeleteMe, onDeleteEveryone }: { isMe: boolean; onDeleteMe: () => void; onDeleteEveryone: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted" aria-label="メッセージメニュー">
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isMe ? "end" : "start"} className="min-w-44">
        <DropdownMenuItem onClick={onDeleteMe}>
          <Trash2 className="w-4 h-4 mr-2" />
          自分の画面から削除
        </DropdownMenuItem>
        {isMe && (
          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={onDeleteEveryone}>
            <Trash2 className="w-4 h-4 mr-2" />
            相手の画面からも削除
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function roleLabel(role?: string) {
  if (role === "store") return "店舗";
  if (role === "therapist") return "セラピスト";
  if (role === "customer") return "お客様";
  return role ?? "";
}
