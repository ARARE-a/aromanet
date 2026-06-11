import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  isLoading: true,
  refetch: () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, refetch } = trpc.aroAuth.getSession.useQuery(undefined, {
    retry: false,
    staleTime: 60000,
  });

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
    <SessionContext.Provider value={{ session, isLoading, refetch }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
