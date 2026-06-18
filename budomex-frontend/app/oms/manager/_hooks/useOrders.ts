"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";

export type BackendWorkerRef = { id: number; name: string };

export type BackendOrder = {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerAddress: string | null;
  productType: string;
  productSpecifications: string;
  quantity: number;
  status: string;
  submissionDate: string;
  price: number | null;
  estimatedDeliveryDate: string | null;
  managerNotes: string | null;
  completionPercentage: number | null;
  installationDate: string | null;
  productionNotes: string | null;
  assignedWorkers: BackendWorkerRef[];
};

export type OrdersResponse = {
  orders: BackendOrder[];
  countOczekujace: number;
  countWRealizacji: number;
  countZrealizowane: number;
  countMontaz: number;
  countOverdue: number;
  totalValue: number | string;
  lowStockCount: number;
};

export function useOrders() {
  return useSWR<OrdersResponse>("/api/manager/orders", fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });
}
