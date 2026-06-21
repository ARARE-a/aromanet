import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useSession } from "@/contexts/SessionContext";
import { trpc } from "@/lib/trpc";

function playAlarmTone() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 1.25);
  } catch {
    // Mobile browsers may block sound until the user interacts with the page.
  }
}

function sendBrowserNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  const notify = () => new Notification(title, { body, tag: "aromanet-reservation-alert" });
  if (Notification.permission === "granted") {
    notify();
    return;
  }
  if (Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") notify();
    }).catch(() => {});
  }
}

export function TherapistReservationAlarm() {
  const { session } = useSession();
  const [, navigate] = useLocation();
  const alertedIds = useRef<Set<number>>(new Set());

  const { data: alerts } = trpc.therapist.getUrgentReservationAlerts.useQuery(undefined, {
    enabled: session?.role === "therapist",
    refetchInterval: 30000,
    retry: false,
  });

  useEffect(() => {
    if (session?.role !== "therapist" || !alerts?.length) return;
    for (const alert of alerts as any[]) {
      const id = Number(alert.notificationId);
      if (!id || alertedIds.current.has(id)) continue;
      alertedIds.current.add(id);
      const body = `${alert.customerName ?? "お客様"} / ${alert.date ?? ""} ${alert.startTime ?? ""}`;

      toast.error("予約通知が10分以上未読です", {
        description: body,
        duration: 15000,
        action: {
          label: "予約を見る",
          onClick: () => navigate("/therapist/reservations"),
        },
      });
      navigator.vibrate?.([700, 250, 700, 250, 1200]);
      playAlarmTone();
      sendBrowserNotification("AromaNet 予約アラーム", body);
    }
  }, [alerts, navigate, session?.role]);

  return null;
}
