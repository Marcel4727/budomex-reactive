"use client";

import { useEffect, useState } from "react";
import Icon from "../../_components/Icon";
import { ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { saveProductionNotes } from "../_lib/api";
import { invalidateWorkerOrder } from "../_lib/mutations";

const MAX = 500;

type Props = {
  orderId: number;
  initialNotes: string | null;
};

export default function NotesCard({ orderId, initialNotes }: Props) {
  const toast = useToast();
  const [serverNotes, setServerNotes] = useState<string>(initialNotes ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(initialNotes ?? "");
  const [saving, setSaving] = useState(false);

  // Synchronizuj lokalną kopię z serwerem gdy SWR refetchuje
  useEffect(() => {
    setServerNotes(initialNotes ?? "");
  }, [initialNotes]);

  const startEdit = () => {
    setDraft(serverNotes);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(serverNotes);
    setEditing(false);
  };

  const handleSave = async () => {
    if (saving) return;
    const value = draft.trim();
    if (value === serverNotes.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await saveProductionNotes(orderId, value);
      setServerNotes(value);
      setEditing(false);
      toast.success(
        "Notatki zapisane",
        value ? undefined : "Pole zostało wyczyszczone.",
      );
      await invalidateWorkerOrder(orderId);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message || `Błąd ${err.status}`
          : "Sprawdź połączenie z backendem.";
      toast.error("Nie udało się zapisać notatek", message);
    } finally {
      setSaving(false);
    }
  };

  const counterClass =
    draft.length > MAX * 0.9
      ? draft.length > MAX
        ? "bad"
        : "warn"
      : "";

  const hasNotes = serverNotes.trim().length > 0;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <h3 className="card-title">Notatki produkcyjne</h3>
          <span className="card-sub">
            {hasNotes ? "zapisane" : "brak"}
          </span>
        </div>
        {!editing && (
          <button
            type="button"
            className="qm-section-edit-btn"
            onClick={startEdit}
            aria-label={hasNotes ? "Edytuj notatki" : "Dodaj notatkę"}
          >
            <Icon name={hasNotes ? "file-text" : "plus"} size={12} />
            {hasNotes ? "Edytuj" : "Dodaj"}
          </button>
        )}
      </div>

      {!editing ? (
        hasNotes ? (
          <div
            className="note-view"
            style={{
              padding: "14px 18px 16px",
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "var(--text-mute)",
              whiteSpace: "pre-wrap",
            }}
          >
            {serverNotes}
          </div>
        ) : (
          <div className="note-empty">
            Brak notatek dla tego zamówienia. Kliknij „Dodaj" żeby zostawić informację dla siebie i managera.
          </div>
        )
      ) : (
        <div className="note-form">
          <div className="note-textarea-wrap">
            <textarea
              className="note-textarea"
              placeholder="Dodaj notatkę produkcyjną…"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX + 50))}
              maxLength={MAX + 50}
              aria-label="Treść notatki"
              autoFocus
              disabled={saving}
            />
            <div
              className={`note-counter ${counterClass}`}
              aria-live="polite"
              aria-atomic="true"
            >
              <span aria-hidden="true">
                {draft.length} / {MAX}
              </span>
              <span className="sr-only">
                Wpisano {draft.length} z {MAX} dozwolonych znaków.
              </span>
            </div>
          </div>
          <div className="note-form-foot">
            <div className="visibility-note">
              <Icon name="eye" size={12} />
              <span>Notatka jest widoczna dla managera</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="btn ghost sm"
                onClick={cancelEdit}
                disabled={saving}
              >
                Anuluj
              </button>
              <button
                type="button"
                className="btn sm"
                onClick={handleSave}
                disabled={saving || draft.length > MAX}
              >
                {saving ? (
                  <>
                    <Icon name="refresh-cw" size={13} />
                    Zapisuję…
                  </>
                ) : (
                  <>
                    <Icon name="save" size={13} />
                    Zapisz
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
