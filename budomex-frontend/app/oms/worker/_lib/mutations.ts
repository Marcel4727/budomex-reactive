"use client";

import { mutate } from "swr";

export function invalidateWorkerOrder(orderId: number | null) {
  return mutate((key) => {
    if (typeof key !== "string") return false;
    if (
      key === "/api/worker/orders" ||
      key === "/api/worker/stats" ||
      key === "/api/worker/history"
    ) {
      return true;
    }
    if (orderId != null && key === `/api/worker/order/${orderId}`) {
      return true;
    }
    return false;
  });
}

export function invalidateWorkerScope() {
  return mutate(
    (key) => typeof key === "string" && key.startsWith("/api/worker/"),
  );
}
