"use client";

import { useEffect, useRef } from "react";

/**
 * Mapuje topic STOMP-style (np. "/topic/orders") na ścieżkę natywnego
 * WebSocketa wystawianą przez backend (np. "/ws/orders").
 * Patrz: NotificationWebSocketHandler.resolveTopic (backend) - to odwrotność tej funkcji.
 */
function topicToWsPath(topic: string): string | null {
  if (topic === "/topic/orders") return "/ws/orders";
  if (topic === "/topic/inventory") return "/ws/inventory";
  if (topic.startsWith("/topic/track/")) {
    const acceptanceToken = topic.substring("/topic/track/".length);
    return `/ws/track/${acceptanceToken}`;
  }
  return null;
}

function wsBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
  return base.replace(/^http/, "ws");
}

export type StompSubscription = {
  topic: string;
  onMessage: () => void;
};

/**
 * Otwiera połączenia WebSocket (jedno per topic — backend routes po ścieżce,
 * nie ma multipleksowania SUBSCRIBE jak w STOMP) i wywołuje onMessage przy
 * każdym przychodzącym evencie innym niż PING (heartbeat backendu).
 *
 * Nazwa `useStomp` została zachowana dla zgodności z miejscami wywołania
 * (RealtimeBridge, TrackingPanel) — backend nie używa już protokołu STOMP,
 * tylko natywny WebSocket, ale kontrakt "topic + onMessage" jest identyczny,
 * więc żadny inny plik nie wymagał zmian.
 *
 * - Reconnect automatyczny co 4s przy zerwaniu połączenia.
 * - token (JWT) idzie jako parametr zapytania ?token=... (handshake WS nie
 *   przechodzi przez zwykły WebFilter HTTP, więc nagłówek Authorization
 *   by nie zadziałał - backend czyta token z query string, patrz
 *   NotificationWebSocketHandler.isAuthorized).
 * - Topiki publiczne (track) łączą się bez tokenu.
 */
export function useStomp(
  subscriptions: StompSubscription[],
  options: { token?: string | null; enabled?: boolean } = {},
) {
  const { token = null, enabled = true } = options;
  const subsRef = useRef<StompSubscription[]>(subscriptions);
  subsRef.current = subscriptions;
  const topicsKey = subscriptions.map((s) => s.topic).join("|");

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const sockets: WebSocket[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let closed = false;

    subsRef.current.forEach((sub) => {
      const wsPath = topicToWsPath(sub.topic);
      if (!wsPath) return;

      const connect = () => {
        if (closed) return;

        const url = new URL(wsBaseUrl() + wsPath);
        if (token) url.searchParams.set("token", token);

        const socket = new WebSocket(url.toString());
        sockets.push(socket);

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === "PING") return; // heartbeat, nie wymaga refetchu
          } catch {
            // payload nieoczekiwany — i tak traktujemy jako sygnał odświeżenia
          }
          const latest = subsRef.current.find((x) => x.topic === sub.topic);
          latest?.onMessage();
        };

        socket.onclose = () => {
          if (closed) return;
          const timer = setTimeout(connect, 4000);
          timers.push(timer);
        };

        socket.onerror = () => {
          socket.close();
        };
      };

      connect();
    });

    return () => {
      closed = true;
      timers.forEach(clearTimeout);
      sockets.forEach((s) => s.close());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, token, topicsKey]);
}
