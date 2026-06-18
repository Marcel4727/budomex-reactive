"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";

export type MonthlyStatsRow = {
  name: string;
  zamowienia: number;
};

export function useMonthlyStats() {
  return useSWR<MonthlyStatsRow[]>("/api/manager/monthly-stats", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });
}
