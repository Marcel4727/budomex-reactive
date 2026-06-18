"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import type { BackendOrder } from "./useOrders";

export type ProductionTask = {
  id: number;
  description: string;
  completed: boolean | null;
  sequenceNumber: number;
};

export type HistoryEntry = {
  id: number;
  previousStatus: string | null;
  newStatus: string;
  changedAt: string;
  notes: string | null;
};

export type OrderDetail = BackendOrder & {
  productionTasks: ProductionTask[];
  history: HistoryEntry[];
};

export function useOrderDetail(orderId: number | null) {
  return useSWR<OrderDetail>(
    orderId != null ? `/api/manager/order/${orderId}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
    },
  );
}
