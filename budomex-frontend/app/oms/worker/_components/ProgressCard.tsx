"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "../../_components/Icon";

type Props = {
  done: number;
  total: number;
  syncing: boolean;
};

const R = 58;
const C = 2 * Math.PI * R;

export default function ProgressCard({ done, total, syncing }: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const remaining = total - done;
  const offset = C * (1 - pct / 100);

  const [displayPct, setDisplayPct] = useState(pct);
  const prevPctRef = useRef(pct);

  useEffect(() => {
    const start = prevPctRef.current;
    const target = pct;
    if (start === target) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplayPct(target);
      prevPctRef.current = target;
      return;
    }

    const startTime = performance.now();
    const dur = 600;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayPct(Math.round(start + (target - start) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else prevPctRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  return (
    <div className="progress-card">
      <div className="progress-row">
        <div className="progress-ring-wrap">
          <svg
            className="progress-ring"
            viewBox="0 0 140 140"
            role="img"
            aria-label={`Postęp produkcji: ${pct}%`}
          >
            <circle className="track" cx="70" cy="70" r={R} />
            <circle
              className="fill"
              cx="70"
              cy="70"
              r={R}
              strokeDasharray={C}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="progress-ring-center">
            <div
              className="progress-ring-pct"
              aria-live="polite"
              aria-atomic="true"
            >
              {displayPct}%
            </div>
            <div className="progress-ring-label">postęp</div>
          </div>
        </div>

        <div className="progress-stats">
          <div className="ps-row">
            <div className="ps-label">Ukończone</div>
            <div className="ps-value">
              {done} <span className="sub">z {total} zadań</span>
            </div>
          </div>
          <div className="ps-row">
            <div className="ps-label">Status</div>
            <div className="ps-value">
              {remaining === 0
                ? "gotowe"
                : remaining === total
                  ? "do startu"
                  : "w toku"}
            </div>
          </div>
        </div>
      </div>

      <div className={`progress-sync ${syncing ? "syncing" : ""}`}>
        <Icon name={syncing ? "refresh-cw" : "check-circle"} size={14} />
        <span>
          {syncing
            ? "Synchronizacja z serwerem…"
            : "Dane odświeżane automatycznie co 20 s"}
        </span>
      </div>
    </div>
  );
}
