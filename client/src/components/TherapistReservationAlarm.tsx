import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

type UrgentReservationAlert = {
  notificationId: number | string;
  customerName?: string | null;
  date?: string | null;
  startTime?: string | null;
  courseName?: string | null;
};

function formatAlertBody(alert: UrgentReservationAlert) {
  const customer = alert.customerName || "お客様";
  const dateTime = [alert.date, alert.startTime].filter(Boolean).join(" ");
  const course = alert.courseName ? ` / ${alert.courseName}` : "";
  return `${customer} / ${dateTime}${course}`;
}

function playAlarmTone() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 1.25);
  } catch {
    // Mobile browsers may block sound until the user interacts with the page.
  }
}

function playAlarmSequence() {
  playAlarmTone();
  window.setTimeout(playAlarmTone, 900);
  window.setTimeout(playAlarmTone, 1800);
}

function sendBrowserNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  const notify = () => new Notification(title, { body, tag: "aromanet-reservation-alert" });
  if (Notification.permission === "granted") {
    notify();
    return;
  }
  if (Notification.permission === "default") {
    Notification.requestPermission()
      .then((permission) => {
        if (permission === "granted") notify();
      })
      .catch(() => {});
  }
}

export function TherapistReservationAlarm() {
  const { session } = useSession();
  const [, navigate] = useLocation();
  const alertedIds = useRef<Set<number>>(new Set());
  const [activeAlert, setActiveAlert] = useState<UrgentReservationAlert | null>(null);

  const { data: alerts } = trpc.therapist.getUrgentReservationAlerts.useQuery(undefined, {
    enabled: session?.role === "therapist",
    refetchInterval: 30000,
    retry: false,
  });

  useEffect(() => {
    if (session?.role !== "therapist") setActiveAlert(null);
  }, [session?.role]);

  useEffect(() => {
    if (session?.role !== "therapist" || !alerts?.length) return;
    for (const alert of alerts as UrgentReservationAlert[]) {
      const id = Number(alert.notificationId);
      if (!id || alertedIds.current.has(id)) continue;
      alertedIds.current.add(id);

      const body = formatAlertBody(alert);
      setActiveAlert(alert);

      toast.error("予約通知が10分以上未読です", {
        description: body,
        duration: 20000,
        action: {
          label: "予約を見る",
          onClick: () => navigate("/therapist/reservations"),
        },
      });
      navigator.vibrate?.([700, 250, 700, 250, 1200]);
      playAlarmSequence();
      sendBrowserNotification("AromaNet 予約アラーム", body);
    }
  }, [alerts, navigate, session?.role]);

  if (session?.role !== "therapist" || !activeAlert) return null;

  const body = formatAlertBody(activeAlert);

  return (
    <div className="fixed inset-x-3 top-16 z-[1000] mx-auto max-w-md rounded-2xl border border-red-200 bg-white p-4 shadow-2xl" role="alert" aria-live="assertive">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-xl text-red-600">!</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-700">予約アラーム</p>
          <p className="mt-1 text-sm font-medium text-foreground">予約通知が10分以上未読です</p>
          <p className="mt-1 break-words text-xs text-muted-foreground">{body}</p>
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              onClick={() => {
                setActiveAlert(null);
                navigate("/therapist/reservations");
              }}
            >
              予約を確認
            </button>
            <button
              type="button"
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground"
              onClick={() => setActiveAlert(null)}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
