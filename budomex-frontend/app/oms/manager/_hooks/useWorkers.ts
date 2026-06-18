"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";

export type WorkloadLevel = "free" | "low" | "medium" | "high" | "critical";

export type BackendWorker = {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  assignedOrders: number;
  workload: WorkloadLevel;
};

export function useWorkers() {
  return useSWR<BackendWorker[]>("/api/manager/hr/workers", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });
}
