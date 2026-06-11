import React, { createContext, useContext } from "react";
import { trpc } from "@/lib/trpc";

export type AromaRole = "store" | "therapist" | "customer" | null;

export interface AromaSession {
  role: AromaRole;
  accountId: number | null;
  storeId?: number;
  therapistId?: number;
  email?: string;
}

interface SessionContextValue {
  session: AromaSession | null;
  isLoading: boolean;
  refetch: () => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  isLoading: true,
  refetch: () => {},
  logout: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, refetch } = trpc.aroAuth.getSession.useQuery(undefined, {
    retry: false,
    staleTime: 30000,
  });

  const logoutMut = trpc.aroAuth.aroLogout.useMutation({
    onSuccess: () => {
      // Force full page reload to clear all React Query cache and navigate to root
      window.location.href = "/";
    },
    onError: () => {
      // Even on error, force reload to clear stale state
      window.location.href = "/";
    },
  });

  const logout = async () => {
    try {
      await logoutMut.mutateAsync();
    } catch {
      // Fallback: force reload anyway
      window.location.href = "/";
    }
  };

  const session: AromaSession | null = data
    ? {
        role: (data as any).role as AromaRole,
        accountId: (data as any).accountId ?? null,
        storeId: (data as any).storeId,
        therapistId: (data as any).therapistId,
        email: (data as any).email,
      }
    : null;

  return (
    <SessionContext.Provider value={{ session, isLoading, refetch, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
