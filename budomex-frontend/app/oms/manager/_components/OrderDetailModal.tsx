"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "../../_components/Icon";
import ConfirmDialog from "../../_components/ConfirmDialog";
import { useOrderDetail } from "../_hooks/useOrderDetail";
import { useWorkers } from "../_hooks/useWorkers";
import { useTaskTemplates } from "../_hooks/useTaskTemplates";
import { api, ApiError } from "@/lib/api";
import { invalidateOrders, invalidateWorkers } from "../_lib/mutations";
import { useToast } from "@/lib/toast";
import { useFocusTrap } from "@/lib/useFocusTrap";
import {
  BACKEND_STATUS_MAP,
  PRODUCT_LABELS,
  formatRef,
  workerColor,
  workerInitials,
  type BackendOrderStatus,
} from "./_data";
import {
  formatLongDate,
  formatPrice,
  formatShortDateTime,
} from "@/lib/format";

type Props = {
  orderId: number;
  onClose: () => void;
};

function statusMeta(status: string): { cls: string; label: string } {
  return (
    BACKEND_STATUS_MAP[status as BackendOrderStatus] ?? {
      cls: "neutral",
      label: status,
    }
  );
}

function workerDisplayName(w: {
  firstName: string | null;
  lastName: string | null;
  username: string;
}): string {
  const full = `${w.firstName ?? ""} ${w.lastName ?? ""}`.trim();
  return full || w.username;
}

const WORKLOAD_LABEL: Record<string, string> = {
  free: "wolny",
  low: "1–2",
  medium: "3–4",
  high: "5–6",
  critical: "7+",
};

type Tab = "details" | "team" | "tasks" | "history";

type PendingLeave = { type: "tab"; tab: Tab } | { type: "close" };

export default function OrderDetailModal({ orderId, onClose }: Props) {
  const { data, error, isLoading } = useOrderDetail(orderId);
  const [tab, setTab] = useState<Tab>("details");
  // Niezapisane zaznaczenia w edytorze zadań — żeby ostrzec przed wyjściem
  // z listy (zmiana zakładki / zamknięcie modala kasuje wybór).
  const [tasksDirty, setTasksDirty] = useState(false);
  const [pending, setPending] = useState<PendingLeave | null>(null);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  const requestTab = useCallback(
    (next: Tab) => {
      if (next === tab) return;
      if (tab === "tasks" && tasksDirty) setPending({ type: "tab", tab: next });
      else setTab(next);
    },
    [tab, tasksDirty],
  );

  const requestClose = useCallback(() => {
    if (tab === "tasks" && tasksDirty) setPending({ type: "close" });
    else onClose();
  }, [tab, tasksDirty, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Gdy otwarte jest potwierdzenie wyjścia — obsługuje je ConfirmDialog.
      if (pending) return;
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, requestClose]);

  const ref = formatRef(orderId);
  const tasksCount = data?.productionTasks.length ?? 0;
  const tasksDone =
    data?.productionTasks.filter((t) => t.completed).length ?? 0;
  const teamCount = data?.assignedWorkers.length ?? 0;
  const historyCount = data?.history.length ?? 0;

  return (
    <div
      className="qm-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Szczegóły zamówienia ${ref}`}
    >
      <div
        ref={trapRef}
        className="qm-modal qm-modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="qm-head">
          <div className="qm-head-text">
            <h3>Szczegóły zamówienia</h3>
            <span className="qm-sub">{ref}</span>
          </div>
          <button
            type="button"
            className="qm-close"
            onClick={requestClose}
            aria-label="Zamknij"
          >
            <Icon name="x" size={16} />
          </button>
        </header>

        {data && (
          <div
            className="qm-tabs"
            role="tablist"
            aria-label="Sekcje zamówienia"
            onKeyDown={(e) => {
              const order: Tab[] = ["details", "team", "tasks", "history"];
              const idx = order.indexOf(tab);
              if (e.key === "ArrowRight") {
                e.preventDefault();
                requestTab(order[(idx + 1) % order.length]);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                requestTab(order[(idx - 1 + order.length) % order.length]);
              } else if (e.key === "Home") {
                e.preventDefault();
                requestTab(order[0]);
              } else if (e.key === "End") {
                e.preventDefault();
                requestTab(order[order.length - 1]);
              }
            }}
          >
            <button
              type="button"
              role="tab"
              id="tab-details"
              aria-selected={tab === "details"}
              aria-controls="panel-details"
              tabIndex={tab === "details" ? 0 : -1}
              className={`qm-tab ${tab === "details" ? "active" : ""}`}
              onClick={() => requestTab("details")}
            >
              Szczegóły
            </button>
            <button
              type="button"
              role="tab"
              id="tab-team"
              aria-selected={tab === "team"}
              aria-controls="panel-team"
              tabIndex={tab === "team" ? 0 : -1}
              className={`qm-tab ${tab === "team" ? "active" : ""}`}
              onClick={() => requestTab("team")}
            >
              Zespół ({teamCount})
            </button>
            <button
              type="button"
              role="tab"
              id="tab-tasks"
              aria-selected={tab === "tasks"}
              aria-controls="panel-tasks"
              tabIndex={tab === "tasks" ? 0 : -1}
              className={`qm-tab ${tab === "tasks" ? "active" : ""}`}
              onClick={() => requestTab("tasks")}
            >
              Zadania{tasksCount > 0 ? ` (${tasksDone}/${tasksCount})` : ""}
            </button>
            <button
              type="button"
              role="tab"
              id="tab-history"
              aria-selected={tab === "history"}
              aria-controls="panel-history"
              tabIndex={tab === "history" ? 0 : -1}
              className={`qm-tab ${tab === "history" ? "active" : ""}`}
              onClick={() => requestTab("history")}
            >
              Historia ({historyCount})
            </button>
          </div>
        )}

        <div className="qm-body">
          {isLoading && (
            <div className="qm-empty">Ładuję szczegóły zamówienia…</div>
          )}

          {error && (
            <div className="qm-error" role="alert">
              <Icon name="alert-circle" size={14} />
              <span>
                Nie udało się pobrać szczegółów. Sprawdź połączenie z backendem.
              </span>
            </div>
          )}

          {data && (
            <>
              <section className="qm-section">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span className={`badge ${statusMeta(data.status).cls}`}>
                    <span className="b-dot" />
                    {statusMeta(data.status).label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--text-dim)",
                    }}
                  >
                    Złożone {formatShortDateTime(data.submissionDate)}
                  </span>
                </div>
              </section>

              {tab === "details" && (
              <div
                role="tabpanel"
                id="panel-details"
                aria-labelledby="tab-details"
              >
              <section className="qm-section">
                <h4>Klient</h4>
                <div className="qm-info-grid">
                  <div className="row">
                    <span className="k">Imię i nazwisko</span>
                    <span className="v">{data.customerName}</span>
                  </div>
                  <div className="row">
                    <span className="k">Email</span>
                    <span className="v mono">{data.customerEmail}</span>
                  </div>
                  <div className="row">
                    <span className="k">Telefon</span>
                    <span className={`v ${data.customerPhone ? "mono" : "muted"}`}>
                      {data.customerPhone || "—"}
                    </span>
                  </div>
                  <div className="row">
                    <span className="k">Adres</span>
                    <span className={`v ${data.customerAddress ? "" : "muted"}`}>
                      {data.customerAddress || "—"}
                    </span>
                  </div>
                </div>
              </section>

              <section className="qm-section">
                <h4>Specyfikacja</h4>
                <div className="qm-info-grid">
                  <div className="row">
                    <span className="k">Produkt</span>
                    <span className="v">
                      {PRODUCT_LABELS[data.productType] ?? data.productType}
                    </span>
                  </div>
                  <div className="row">
                    <span className="k">Ilość</span>
                    <span className="v mono">{data.quantity} szt.</span>
                  </div>
                  <div className="row full">
                    <span className="k">Opis</span>
                    <span className="v spec">{data.productSpecifications}</span>
                  </div>
                  {data.managerNotes && (
                    <div className="row full">
                      <span className="k">Uwagi managera</span>
                      <span className="v spec">{data.managerNotes}</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="qm-section">
                <h4>Cena i terminy</h4>
                <div className="qm-info-grid">
                  <div className="row">
                    <span className="k">Cena</span>
                    <span className={`v ${data.price ? "price" : "muted"}`}>
                      {data.price ? formatPrice(data.price) : "nie wyceniono"}
                    </span>
                  </div>
                  <div className="row">
                    <span className="k">Termin realizacji</span>
                    <span
                      className={`v ${data.estimatedDeliveryDate ? "" : "muted"}`}
                    >
                      {data.estimatedDeliveryDate
                        ? formatLongDate(data.estimatedDeliveryDate)
                        : "—"}
                    </span>
                  </div>
                  <div className="row full">
                    <span className="k">Termin montażu</span>
                    <span
                      className={`v ${data.installationDate ? "" : "muted"}`}
                    >
                      {data.installationDate
                        ? formatShortDateTime(data.installationDate)
                        : "do uzgodnienia"}
                    </span>
                  </div>
                </div>
              </section>
              </div>
              )}

              {tab === "team" && (
                <div
                  role="tabpanel"
                  id="panel-team"
                  aria-labelledby="tab-team"
                >
                  <WorkersSection
                    orderId={orderId}
                    currentWorkers={data.assignedWorkers}
                  />
                </div>
              )}

              {tab === "tasks" && (
                <div
                  role="tabpanel"
                  id="panel-tasks"
                  aria-labelledby="tab-tasks"
                >
                  <TasksSection
                    orderId={orderId}
                    status={data.status as BackendOrderStatus}
                    productType={data.productType}
                    productionTasks={data.productionTasks}
                    onDirtyChange={setTasksDirty}
                  />
                </div>
              )}

              {tab === "history" && (
              <div
                role="tabpanel"
                id="panel-history"
                aria-labelledby="tab-history"
              >
              <section className="qm-section">
                <h4>Historia statusów</h4>
                {data.history.length === 0 ? (
                  <div className="qm-empty">Brak wpisów w historii.</div>
                ) : (
                  <div className="qm-history">
                    {data.history
                      .slice()
                      .reverse()
                      .map((h, idx) => (
                        <div
                          key={h.id}
                          className={`qm-history-entry ${idx === 0 ? "latest" : ""}`}
                        >
                          <span className="when">
                            {formatShortDateTime(h.changedAt)}
                          </span>
                          <span className="change">
                            {h.previousStatus && (
                              <>
                                <span className="from">
                                  {statusMeta(h.previousStatus).label}
                                </span>
                                <span className="arrow">→</span>
                              </>
                            )}
                            <strong>{statusMeta(h.newStatus).label}</strong>
                          </span>
                          {h.notes && <div className="notes">{h.notes}</div>}
                        </div>
                      ))}
                  </div>
                )}
              </section>
              </div>
              )}
            </>
          )}
        </div>

        <div className="qm-foot">
          <button type="button" className="btn secondary" onClick={requestClose}>
            Zamknij
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title="Wyjść z listy zadań?"
        description="Masz niezapisane pozycje. Jeśli teraz wyjdziesz, zaznaczone zadania nie zostaną zapisane."
        confirmLabel="Wyjdź bez zapisywania"
        cancelLabel="Wróć do listy"
        danger
        icon="alert-triangle"
        onConfirm={() => {
          const p = pending;
          setPending(null);
          setTasksDirty(false);
          if (!p) return;
          if (p.type === "close") onClose();
          else setTab(p.tab);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

/* ============================================================
   Workers section — view + edit
   ============================================================ */

function WorkersSection({
  orderId,
  currentWorkers,
}: {
  orderId: number;
  currentWorkers: { id: number; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(currentWorkers.map((w) => w.id)),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { data: workers, isLoading: workersLoading } = useWorkers();
  const toast = useToast();

  // Reset selection when entering edit mode (sync with latest props)
  useEffect(() => {
    if (editing) {
      setSelected(new Set(currentWorkers.map((w) => w.id)));
      setErr(null);
    }
  }, [editing, currentWorkers]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setErr(null);
    setSaving(true);
    try {
      await api(`/api/manager/order/${orderId}/workers`, {
        method: "POST",
        body: JSON.stringify({ workerIds: Array.from(selected) }),
      });
      await invalidateOrders();
      await invalidateWorkers();
      setEditing(false);
      toast.success(
        "Zespół zaktualizowany",
        `Przypisano ${selected.size} ${selected.size === 1 ? "pracownika" : "pracowników"} do zamówienia.`,
      );
    } catch (e) {
      const msg =
        e instanceof ApiError && e.message
          ? e.message
          : "Nie udało się zapisać przypisań.";
      setErr(msg);
      toast.error("Nie zapisano przypisań", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="qm-section">
      <div className="qm-section-head">
        <h4>Zespół przypisany</h4>
        {!editing && (
          <button
            type="button"
            className="qm-section-edit-btn"
            onClick={() => setEditing(true)}
          >
            <Icon name="user-plus" size={12} />
            Edytuj zespół
          </button>
        )}
      </div>

      {!editing ? (
        currentWorkers.length === 0 ? (
          <div className="qm-empty">Brak przypisanych pracowników.</div>
        ) : (
          <div className="qm-workers">
            {currentWorkers.map((w) => (
              <span className="qm-worker-chip" key={w.id}>
                <span className={`av c-${workerColor(w.id)}`}>
                  {workerInitials(w.name)}
                </span>
                {w.name}
              </span>
            ))}
          </div>
        )
      ) : (
        <>
          {workersLoading ? (
            <div className="qm-empty">Ładuję listę pracowników…</div>
          ) : (
            <div className="qm-checklist">
              {(workers ?? []).map((w) => {
                const name = workerDisplayName(w);
                const checked = selected.has(w.id);
                const loadLabel =
                  WORKLOAD_LABEL[w.workload] ?? String(w.assignedOrders);
                const heavy = w.workload === "high" || w.workload === "critical";
                return (
                  <label className="row" key={w.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(w.id)}
                    />
                    <span className="label">{name}</span>
                    <span className="sub">
                      <span className={`pill ${heavy ? "high" : ""}`}>
                        {loadLabel}
                      </span>
                    </span>
                  </label>
                );
              })}
              {(workers ?? []).length === 0 && (
                <div
                  style={{
                    padding: "16px",
                    color: "var(--text-dim)",
                    fontSize: 13,
                    textAlign: "center",
                    background: "var(--bg-elev)",
                  }}
                >
                  Brak pracowników w systemie.
                </div>
              )}
            </div>
          )}

          <div className="qm-edit-foot">
            {err && <span className="qm-edit-status err">{err}</span>}
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Anuluj
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Zapisuję…" : `Zapisz (${selected.size})`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* ============================================================
   Tasks section — view + edit (status-gated)
   ============================================================ */

function TasksSection({
  orderId,
  status,
  productType,
  productionTasks,
  onDirtyChange,
}: {
  orderId: number;
  status: BackendOrderStatus;
  productType: string;
  productionTasks: {
    id: number;
    description: string;
    completed: boolean | null;
    sequenceNumber: number;
  }[];
  onDirtyChange: (dirty: boolean) => void;
}) {
  const canEdit = status === "W_REALIZACJI";
  const [editing, setEditing] = useState(false);
  const { data: templates, isLoading: templatesLoading } = useTaskTemplates(
    editing ? orderId : null,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customDraft, setCustomDraft] = useState("");
  const [customAdded, setCustomAdded] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();

  // Stan wyjściowy wyboru (do wykrycia niezapisanych zmian).
  const [baseline, setBaseline] = useState("");
  const serialize = (set: Set<string>) =>
    Array.from(set).sort().join("");

  // Init selection from existing tasks when entering edit mode
  useEffect(() => {
    if (editing && templates) {
      const existingDescs = templates.existingTasks.map((t) => t.description);
      const completedDescs = templates.existingTasks
        .filter((t) => t.completed)
        .map((t) => t.description);
      const initial = new Set(existingDescs);
      setSelected(initial);
      setBaseline(serialize(initial));
      // Track custom tasks (those not in template list) so they show as extras
      const extras = existingDescs.filter(
        (d) => !templates.templates.includes(d) && !completedDescs.includes(d),
      );
      setCustomAdded(extras);
      setErr(null);
      setCustomDraft("");
    }
  }, [editing, templates]);

  // Niezapisane zmiany = w trybie edycji wybór różni się od wyjściowego
  // albo jest wpisany (lecz nie dodany) tekst własnego zadania.
  const dirty =
    editing &&
    (serialize(selected) !== baseline || customDraft.trim() !== "");

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  // Po odmontowaniu (zmiana zakładki / zamknięcie) wyczyść flagę.
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const toggle = (desc: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(desc)) next.delete(desc);
      else next.add(desc);
      return next;
    });
  };

  const addCustom = () => {
    const v = customDraft.trim();
    if (!v) return;
    setCustomAdded((prev) =>
      prev.includes(v) ? prev : [...prev, v],
    );
    setSelected((prev) => new Set(prev).add(v));
    setCustomDraft("");
  };

  const completedDescriptions = useMemo(
    () =>
      new Set(
        productionTasks.filter((t) => t.completed).map((t) => t.description),
      ),
    [productionTasks],
  );

  const save = async () => {
    setErr(null);
    setSaving(true);
    try {
      const list = Array.from(selected);
      if (list.length === 0) {
        setErr("Wybierz co najmniej jedno zadanie.");
        setSaving(false);
        return;
      }
      await api(`/api/manager/order/${orderId}/tasks`, {
        method: "POST",
        body: JSON.stringify({ tasks: list }),
      });
      await invalidateOrders();
      setEditing(false);
      toast.success(
        "Zadania zapisane",
        `${list.length} ${list.length === 1 ? "zadanie" : "zadań"} przypisanych do zamówienia.`,
      );
    } catch (e) {
      const msg =
        e instanceof ApiError && e.message
          ? e.message
          : "Nie udało się zapisać zadań.";
      setErr(msg);
      toast.error("Nie zapisano zadań", msg);
    } finally {
      setSaving(false);
    }
  };

  const totalDone = productionTasks.filter((t) => t.completed).length;

  return (
    <section className="qm-section">
      <div className="qm-section-head">
        <h4>
          Zadania produkcyjne
          {productionTasks.length > 0 && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 500,
                color: "var(--text-dim)",
                marginLeft: 8,
                letterSpacing: 0,
                textTransform: "none",
                fontSize: 12,
              }}
            >
              ({totalDone} / {productionTasks.length})
            </span>
          )}
        </h4>
        {!editing && (
          <button
            type="button"
            className="qm-section-edit-btn"
            onClick={() => setEditing(true)}
            disabled={!canEdit}
            title={
              canEdit
                ? "Wybierz zadania z szablonu lub dodaj własne"
                : "Dostępne po akceptacji oferty przez klienta"
            }
          >
            <Icon name="clipboard-list" size={12} />
            Edytuj zadania
          </button>
        )}
      </div>

      {!canEdit && productionTasks.length === 0 && (
        <div className="qm-edit-hint">
          Zadania można przypisać dopiero gdy klient zaakceptuje wycenę
          (status: W realizacji).
        </div>
      )}

      {!editing ? (
        productionTasks.length === 0 ? (
          <div className="qm-empty">
            Nie przypisano jeszcze zadań produkcyjnych.
          </div>
        ) : (
          <div className="qm-task-list">
            {productionTasks
              .slice()
              .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
              .map((t) => (
                <div
                  key={t.id}
                  className={`qm-task-row ${t.completed ? "done" : ""}`}
                >
                  <span className="seq">{t.sequenceNumber}.</span>
                  <span className="check">
                    {t.completed && (
                      <Icon name="check" size={11} strokeWidth={3} />
                    )}
                  </span>
                  <span className="desc">{t.description}</span>
                </div>
              ))}
          </div>
        )
      ) : (
        <>
          {templatesLoading || !templates ? (
            <div className="qm-empty">
              Ładuję szablony zadań dla produktu{" "}
              {PRODUCT_LABELS[productType] ?? productType}…
            </div>
          ) : (
            <>
              <div className="qm-checklist">
                {templates.templates.map((desc) => {
                  const completed = completedDescriptions.has(desc);
                  return (
                    <label
                      className={`row ${completed ? "disabled" : ""}`}
                      key={desc}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(desc) || completed}
                        onChange={() => !completed && toggle(desc)}
                        disabled={completed}
                      />
                      <span className="label">{desc}</span>
                      {completed && (
                        <span className="sub">
                          <span className="pill">ukończone</span>
                        </span>
                      )}
                    </label>
                  );
                })}

                {customAdded.map((desc) => {
                  const completed = completedDescriptions.has(desc);
                  return (
                    <label
                      className={`row ${completed ? "disabled" : ""}`}
                      key={`custom-${desc}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(desc) || completed}
                        onChange={() => !completed && toggle(desc)}
                        disabled={completed}
                      />
                      <span className="label">{desc}</span>
                      <span className="sub">
                        <span className="pill">własne</span>
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="qm-custom-add">
                <input
                  type="text"
                  placeholder="Dodaj własne zadanie…"
                  value={customDraft}
                  onChange={(e) => setCustomDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustom();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={addCustom}
                  disabled={!customDraft.trim()}
                >
                  Dodaj
                </button>
              </div>
            </>
          )}

          <div className="qm-edit-foot">
            {err && <span className="qm-edit-status err">{err}</span>}
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Anuluj
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={save}
              disabled={saving || templatesLoading}
            >
              {saving ? "Zapisuję…" : `Zapisz (${selected.size})`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
