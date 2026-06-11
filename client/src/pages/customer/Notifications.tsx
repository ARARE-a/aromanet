import { useEffect } from "react";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { AromaLayout } from "@/components/AromaLayout";
import { useSession } from "@/contexts/SessionContext";

export default function CustomerNotifications() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useSession();
  useEffect(() => { if (!isLoading && (!session || session.role !== "customer")) navigate("/customer/login"); }, [session, isLoading]);
  return (
    <AromaLayout title="通知" showBack backHref="/home">
      <div className="text-center py-16 text-muted-foreground">
        <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">通知はありません</p>
      </div>
    </AromaLayout>
  );
}
