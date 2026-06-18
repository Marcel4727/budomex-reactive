"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";

export type WorkerOrderListItem = {
  id: number;
  customerName: string;
  productType: string;
  completionPercentage: number | null;
  estimatedDeliveryDate: string | null;
  assignedToMe: boolean;
};

export function useWorkerOrders() {
  return useSWR<WorkerOrderListItem[]>("/api/worker/orders", fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });
}
