"use client";

import { mutate } from "swr";

function keyStartsWith(prefix: string) {
  return (key: unknown) =>
    typeof key === "string" && key.startsWith(prefix);
}

export function invalidateOrders() {
  return mutate(
    (key) =>
      typeof key === "string" &&
      (key.startsWith("/api/manager/orders") ||
        key.startsWith("/api/manager/order/") ||
        key === "/api/manager/monthly-stats" ||
        key === "/api/manager/stats"),
  );
}

export function invalidateInventory() {
  return mutate(keyStartsWith("/api/manager/inventory"));
}

export function invalidateWorkers() {
  return mutate(keyStartsWith("/api/manager/hr"));
}
