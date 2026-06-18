"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";

export type WorkerTask = {
  id: number;
  description: string;
  completed: boolean;
  sequenceNumber: number;
  category: string | null;
};

export type WorkerOrderDetail = {
  id: number;
  customerName: string;
  customerAddress: string | null;
  productType: string;
  productSpecifications: string;
  quantity: number;
  status: string;
  completionPercentage: number | null;
  estimatedDeliveryDate: string | null;
  productionNotes: string | null;
  tasks: WorkerTask[];
};

export function useWorkerOrderDetail(orderId: number | null) {
  return useSWR<WorkerOrderDetail>(
    orderId != null ? `/api/worker/order/${orderId}` : null,
    fetcher,
    {
      refreshInterval: 20_000,
      revalidateOnFocus: true,
    },
  );
}
