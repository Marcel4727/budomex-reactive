"use client";

import { mutate } from "swr";
import { getToken } from "@/lib/api";
import { useStomp } from "@/lib/realtime";

/**
 * Most real-time dla OMS. Subskrybuje topiki backendu i przy każdej zmianie
 * wywołuje rewalidację odpowiednich kluczy SWR (push-to-refetch) — dane
 * odświeżają się natychmiast, bez pollingu i bez przeładowania strony.
 */
export default function RealtimeBridge({ token }: { token: string | null }) {
  // token przekazany z OmsShell (po hydracji auth); fallback z localStorage.
  const jwt = token ?? getToken();

  useStomp(
    [
      {
        topic: "/topic/orders",
        onMessage: () => {
          mutate(
            (key) =>
              typeof key === "string" &&
              (key === "/api/manager/orders" ||
                key.startsWith("/api/manager/order/") ||
                key === "/api/manager/monthly-stats" ||
                key === "/api/manager/stats" ||
                key.startsWith("/api/manager/hr") ||
                key.startsWith("/api/worker/")),
          );
        },
      },
      {
        topic: "/topic/inventory",
        onMessage: () => {
          mutate(
            (key) =>
              typeof key === "string" &&
              key.startsWith("/api/manager/inventory"),
          );
        },
      },
    ],
    { token: jwt },
  );

  return null;
}
