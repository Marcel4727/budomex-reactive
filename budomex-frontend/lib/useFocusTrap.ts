"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Pułapka focusu dla modali / dialogów.
 * - Po otwarciu przenosi focus do pierwszego focusowalnego elementu wewnątrz refa.
 * - Tab/Shift+Tab cyklują wewnątrz kontenera.
 * - Po zamknięciu (active=false) przywraca focus do elementu, który miał focus przed otwarciem.
 *
 * Użycie: `const ref = useFocusTrap<HTMLDivElement>(open);` na elemencie modala.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    previousActiveRef.current = document.activeElement as HTMLElement | null;

    // Initial focus
    const focusables = Array.from(
      node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    if (focusables.length > 0) {
      // Don't override if something inside is already focused
      const alreadyInside = node.contains(document.activeElement);
      if (!alreadyInside) {
        // Prefer first non-close button
        const target =
          focusables.find(
            (el) => el.getAttribute("aria-label") !== "Zamknij",
          ) ?? focusables[0];
        target.focus();
      }
    } else {
      node.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const current = document.activeElement as HTMLElement;
      if (e.shiftKey) {
        if (current === first || !node.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (current === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const prev = previousActiveRef.current;
      if (prev && typeof prev.focus === "function") {
        prev.focus();
      }
    };
  }, [active]);

  return ref;
}
