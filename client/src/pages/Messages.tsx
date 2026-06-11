import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Send, Image, AlertTriangle, ChevronLeft, MessageCircle } from "lucide-react";
import { AromaLayout, AromaAvatar } from "@/components/AromaLayout";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/contexts/SessionContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

const QUICK_REPLIES = [
  "ご予約ありがとうございます",
  "本日のご来店お待ちしております",
  "ご不明な点はお気軽にご連絡ください",
  "またのご来店をお待ちしております",
];

export default function Messages() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  const [selectedThread, setSelectedThread] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !session) navigate("/");
  }, [session, isLoading]);

  const { data: threads, refetch: refetchThreads } = trpc.message.getThreads.useQuery(undefined, { enabled: !!session });
  const { data: messages, refetch: refetchMessages } = trpc.message.getMessages.useQuery(
    { threadId: selectedThread! },
    { enabled: !!session && !!selectedThread, refetchInterval: 5000 }
  );

  const sendMut = trpc.message.send.useMutation({
    onSuccess: () => { setMessage(""); refetchMessages(); refetchThreads(); },
    onError: (e: any) => toast.error(e.message),
  });
  const reportMut = trpc.message.reportMessage.useMutation({
    onSuccess: () => toast.success("通報しました"),
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const threadList = (threads as any[]) ?? [];
  const messageList = (messages as any[]) ?? [];
  const currentThread = threadList.find((t: any) => t.id === selectedThread);

  const handleSend = () => {
    if (!message.trim() || !selectedThread) return;
    sendMut.mutate({ threadId: selectedThread, content: message.trim() });
  };

  if (selectedThread) {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 glass border-b border-border/50 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSelectedThread(null)} className="p-1 -ml-1 rounded-full hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5 text-charcoal" />
          </button>
          <AromaAvatar name={currentThread?.otherName} src={currentThread?.otherAvatar} size="sm" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">{currentThread?.otherName}</div>
            <div className="text-xs text-muted-foreground">{currentThread?.otherRole}</div>
          </div>
          <button onClick={() => reportMut.mutate({ messageId: selectedThread!, reason: "不適切なメッセージ" })}
            className="p-2 rounded-full hover:bg-muted transition-colors">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-32">
          {messageList.map((msg: any) => {
            const isMe = msg.senderRole === session?.role;
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2`}>
                {!isMe && <AromaAvatar name={currentThread?.otherName} size="sm" />}
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-white rounded-br-sm" : "bg-white shadow-luxury text-foreground rounded-bl-sm"}`}>
                    {msg.imageUrl && <img src={msg.imageUrl} alt="" className="w-full rounded-lg mb-1 max-w-[200px]" />}
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">
                    {msg.createdAt ? format(new Date(msg.createdAt), "HH:mm") : ""}
                    {isMe && (msg.isRead ? " 既読" : " 未読")}
                  </span>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick replies */}
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-1">
          <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
            {QUICK_REPLIES.map(q => (
              <button key={q} onClick={() => setMessage(q)}
                className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-white shadow-luxury text-muted-foreground hover:text-primary hover:border-primary border border-border/50 transition-colors">
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md glass border-t border-border/50 px-4 py-3 flex items-center gap-2">
          <Input value={message} onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="メッセージを入力..." className="flex-1 rounded-xl h-9" />
          <Button size="sm" className="w-9 h-9 rounded-xl gradient-luxury text-white p-0 flex-shrink-0"
            onClick={handleSend} disabled={!message.trim() || sendMut.isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AromaLayout title="メッセージ">
      <div className="px-4 py-3 space-y-2">
        {threadList.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">メッセージはありません</p>
          </div>
        ) : threadList.map((thread: any, i: number) => (
          <motion.div key={thread.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <button onClick={() => setSelectedThread(thread.id)}
              className="w-full bg-white rounded-2xl p-4 shadow-luxury flex items-center gap-3 hover:shadow-md transition-shadow text-left">
              <div className="relative">
                <AromaAvatar name={thread.otherName} src={thread.otherAvatar} size="md" />
                {thread.unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{thread.otherName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {thread.lastMessageAt ? format(new Date(thread.lastMessageAt), "MM/dd HH:mm") : ""}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.lastMessage ?? "メッセージがありません"}</p>
              </div>
            </button>
          </motion.div>
        ))}
      </div>
    </AromaLayout>
  );
}
