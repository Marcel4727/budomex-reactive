"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";

export type BackendInventoryItem = {
  id: number;
  name: string;
  category: string | null;
  unit: string | null;
  currentQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumThreshold: number;
  lowStock: boolean;
};

export function useInventory() {
  return useSWR<BackendInventoryItem[]>(
    "/api/manager/inventory/low-stock",
    fetcher,
    {
      refreshInterval: 120_000,
      revalidateOnFocus: true,
    },
  );
}
