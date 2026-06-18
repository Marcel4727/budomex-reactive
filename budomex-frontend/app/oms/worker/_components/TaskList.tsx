"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../../_components/Icon";
import type { WorkerTask } from "../_hooks/useWorkerOrderDetail";

export type Filter = "all" | "active" | "done";

type Props = {
  tasks: WorkerTask[];
  onToggle: (task: WorkerTask) => void;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  bumpingId: number | null;
  glowingId: number | null;
};

function visibleTasks(tasks: WorkerTask[], filter: Filter): WorkerTask[] {
  if (filter === "done") return tasks.filter((t) => t.completed);
  if (filter === "active") return tasks.filter((t) => !t.completed);
  return tasks;
}

function categoryLabel(c: string | null): string {
  if (!c) return "Pozostałe";
  return c;
}

export default function TaskList({
  tasks,
  onToggle,
  filter,
  onFilterChange,
  bumpingId,
  glowingId,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [recentlyDoneSection, setRecentlyDoneSection] = useState<string | null>(
    null,
  );
  const prevSectionStatusRef = useRef<Record<string, boolean>>({});

  const sortedTasks = useMemo(
    () =>
      tasks.slice().sort((a, b) => a.sequenceNumber - b.sequenceNumber),
    [tasks],
  );

  // Aktywne zadanie = pierwsze niedokończone w sekwencji
  const activeTaskId = useMemo(
    () => sortedTasks.find((t) => !t.completed)?.id ?? null,
    [sortedTasks],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, WorkerTask[]>();
    for (const t of sortedTasks) {
      const key = categoryLabel(t.category);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries());
  }, [sortedTasks]);

  // Detect when a section just became fully done — show celebratory banner.
  useEffect(() => {
    const prev = prevSectionStatusRef.current;
    const next: Record<string, boolean> = {};
    for (const [category, list] of grouped) {
      next[category] = list.length > 0 && list.every((t) => t.completed);
      if (next[category] && prev[category] === false) {
        setRecentlyDoneSection(category);
        const timer = setTimeout(() => setRecentlyDoneSection(null), 2400);
        prevSectionStatusRef.current = next;
        return () => clearTimeout(timer);
      }
    }
    prevSectionStatusRef.current = next;
  }, [grouped]);

  const totalDone = sortedTasks.filter((t) => t.completed).length;
  const totalAll = sortedTasks.length;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <h3 className="card-title">Zadania produkcyjne</h3>
          <span className="card-sub">
            {totalDone} / {totalAll}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div
            className="seg"
            role="group"
            aria-label="Filtr zadań"
          >
            <button
              type="button"
              className={`seg-btn ${filter === "all" ? "active" : ""}`}
              aria-pressed={filter === "all"}
              onClick={() => onFilterChange("all")}
            >
              Wszystkie
            </button>
            <button
              type="button"
              className={`seg-btn ${filter === "active" ? "active" : ""}`}
              aria-pressed={filter === "active"}
              onClick={() => onFilterChange("active")}
            >
              Aktywne
            </button>
            <button
              type="button"
              className={`seg-btn ${filter === "done" ? "active" : ""}`}
              aria-pressed={filter === "done"}
              onClick={() => onFilterChange("done")}
            >
              Ukończone
            </button>
          </div>
        </div>
      </div>

      {totalAll === 0 && (
        <div
          style={{
            padding: "28px 20px",
            textAlign: "center",
            color: "var(--text-dim)",
            fontSize: 13.5,
            fontStyle: "italic",
          }}
        >
          Manager nie przypisał jeszcze zadań do tego zamówienia.
        </div>
      )}

      {grouped.map(([category, sectionTasks], sIdx) => {
        const sectionDone = sectionTasks.filter((t) => t.completed).length;
        const sectionTotal = sectionTasks.length;
        const allDone = sectionDone === sectionTotal && sectionTotal > 0;
        const sectionPct = sectionTotal > 0 ? (sectionDone / sectionTotal) * 100 : 0;
        const isCollapsed = !!collapsed[category];
        const visibles = visibleTasks(sectionTasks, filter);
        const isLast = sIdx === grouped.length - 1;

        return (
          <div
            key={category}
            className={`task-section ${isCollapsed ? "collapsed" : ""} ${allDone ? "task-section-done" : ""} ${isLast ? "last-of" : ""}`}
          >
            <button
              type="button"
              className="task-section-head"
              onClick={() =>
                setCollapsed((c) => ({ ...c, [category]: !c[category] }))
              }
              aria-expanded={!isCollapsed}
            >
              <span className="chev">
                <Icon name="chevron-down" size={15} />
              </span>
              <h4>{category}</h4>
              <div className="task-section-progress">
                {allDone && (
                  <span className="section-done-badge">
                    <Icon name="check" size={11} strokeWidth={3} />
                    Sekcja ukończona
                  </span>
                )}
                <div className="task-section-bar">
                  <div
                    className={`task-section-bar-fill ${allDone ? "" : "partial"}`}
                    style={{ width: `${sectionPct}%` }}
                  />
                </div>
                <span className="task-section-count">
                  {sectionDone} / {sectionTotal}
                </span>
              </div>
            </button>

            {recentlyDoneSection === category && (
              <div className="section-done-banner-wrap">
                <div className="section-done-banner" role="status">
                  <Icon name="check-circle" size={14} />
                  <span>
                    Sekcja „{category}" ukończona. Świetna robota.
                  </span>
                </div>
              </div>
            )}

            <div className="task-section-body">
              {visibles.map((t) => {
                const isActive = activeTaskId === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    data-task-id={t.id}
                    className={`task-row ${t.completed ? "done" : ""} ${isActive ? "active-task" : ""} ${glowingId === t.id ? "glow" : ""}`}
                    onClick={() => onToggle(t)}
                    role="checkbox"
                    aria-checked={t.completed}
                    aria-label={t.description}
                  >
                    <span
                      className={`task-check ${bumpingId === t.id ? "bumping" : ""} ${isActive && !t.completed ? "active-target" : ""}`}
                      aria-hidden="true"
                    >
                      {t.completed && (
                        <Icon name="check" size={14} strokeWidth={3} />
                      )}
                    </span>
                    <div className="task-body">
                      <div className="task-name">
                        {t.description}
                        {isActive && !t.completed && (
                          <>
                            <span className="active-tag">aktywne</span>
                            <span className="sr-only">— następne do wykonania</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="task-meta">
                      {t.completed ? "Ukończone" : "Do zrobienia"}
                    </div>
                  </button>
                );
              })}

              {visibles.length === 0 && sectionTotal > 0 && (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "var(--text-dim)",
                    fontSize: 13.5,
                    fontStyle: "italic",
                  }}
                >
                  Brak zadań w tym filtrze.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
