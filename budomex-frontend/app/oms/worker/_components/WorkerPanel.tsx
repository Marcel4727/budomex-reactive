"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  useWorkerOrderDetail,
  type WorkerOrderDetail,
  type WorkerTask,
} from "../_hooks/useWorkerOrderDetail";
import { useWorkerOrders } from "../_hooks/useWorkerOrders";
import {
  completeTask as apiComplete,
  revertTask as apiRevert,
} from "../_lib/api";
import {
  invalidateWorkerOrder,
  invalidateWorkerScope,
} from "../_lib/mutations";
import OrderHeader from "./OrderHeader";
import ProgressCard from "./ProgressCard";
import TaskList, { type Filter } from "./TaskList";
import OrderInfo from "./OrderInfo";
import NotesCard from "./NotesCard";
import MiniTimeline from "./MiniTimeline";
import ToastStack, { type Toast } from "./ToastStack";
import WorkerEmptyState from "./WorkerEmptyState";
import CelebrationModal from "./CelebrationModal";

type Props = { orderId: number | null };

type UndoInfo = { taskId: number };

function patchTask(
  data: WorkerOrderDetail | undefined,
  taskId: number,
  completed: boolean,
): WorkerOrderDetail | undefined {
  if (!data) return data;
  return {
    ...data,
    tasks: data.tasks.map((t) =>
      t.id === taskId ? { ...t, completed } : t,
    ),
  };
}

const FILTER_KEY = "bdx-oms-worker-task-filter";

function readStoredFilter(): Filter {
  if (typeof window === "undefined") return "all";
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (raw === "active" || raw === "done" || raw === "all") return raw;
  } catch {}
  return "all";
}

export default function WorkerPanel({ orderId }: Props) {
  const { data, error, isLoading, mutate } = useWorkerOrderDetail(orderId);
  const { data: ordersList, isLoading: ordersLoading } = useWorkerOrders();
  const [filter, setFilterState] = useState<Filter>("all");

  // Hydrate filter from localStorage po mount (uniknięcie SSR mismatch).
  useEffect(() => {
    setFilterState(readStoredFilter());
  }, []);

  const setFilter = useCallback((f: Filter) => {
    setFilterState(f);
    try {
      localStorage.setItem(FILTER_KEY, f);
    } catch {}
  }, []);
  const [syncing, setSyncing] = useState(false);
  const [bumpingId, setBumpingId] = useState<number | null>(null);
  const [glowingId, setGlowingId] = useState<number | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const undoMapRef = useRef<Record<string, UndoInfo>>({});

  const dismissToast = useCallback((id: string) => {
    setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(
      () => setToasts((ts) => ts.filter((t) => t.id !== id)),
      200,
    );
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
    delete undoMapRef.current[id];
  }, []);

  const pushToast = useCallback(
    (
      t: Omit<Toast, "id">,
      autoDismiss = 5000,
      undoInfo?: UndoInfo,
    ): string => {
      const id = `tst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const toast: Toast = { id, ...t };
      setToasts((ts) => [toast, ...ts].slice(0, 3));
      if (undoInfo) undoMapRef.current[id] = undoInfo;
      if (autoDismiss) {
        toastTimers.current[id] = setTimeout(() => dismissToast(id), autoDismiss);
      }
      return id;
    },
    [dismissToast],
  );

  const performToggle = useCallback(
    async (taskId: number, becameCompleted: boolean) => {
      // Optimistic
      mutate((curr) => patchTask(curr, taskId, becameCompleted), {
        revalidate: false,
      });
      setBumpingId(taskId);
      setTimeout(() => setBumpingId(null), 360);
      if (becameCompleted) {
        setGlowingId(taskId);
        setTimeout(() => setGlowingId(null), 360);
      }
      setSyncing(true);
      try {
        const res = becameCompleted
          ? await apiComplete(taskId)
          : await apiRevert(taskId);
        // Peak-End: gdy ukończenie taska zamknęło całe zamówienie (100%).
        if (
          becameCompleted &&
          res.completionPercentage === 100 &&
          (res.orderStatus === "ZREALIZOWANE" || res.orderStatus === "KONIEC")
        ) {
          setShowCelebration(true);
        }
      } catch (err) {
        // Rollback
        mutate();
        const message =
          err instanceof ApiError
            ? err.message || `Błąd ${err.status}`
            : "Nie udało się zapisać zmiany.";
        pushToast({
          variant: "info",
          icon: "alert-circle",
          title: "Nie zapisano",
          desc: message,
        });
      } finally {
        setSyncing(false);
        invalidateWorkerOrder(orderId);
        invalidateWorkerScope();
      }
    },
    [mutate, orderId, pushToast],
  );

  const onToggleTask = useCallback(
    (task: WorkerTask) => {
      const becameCompleted = !task.completed;
      performToggle(task.id, becameCompleted);
      if (becameCompleted) {
        pushToast(
          {
            variant: "success",
            icon: "check",
            title: "Zadanie ukończone",
            desc: task.description,
            undo: true,
          },
          9000,
          { taskId: task.id },
        );
      }
    },
    [performToggle, pushToast],
  );

  const undoToast = useCallback(
    (toastId: string) => {
      const info = undoMapRef.current[toastId];
      if (!info) {
        dismissToast(toastId);
        return;
      }
      performToggle(info.taskId, false);
      dismissToast(toastId);
    },
    [dismissToast, performToggle],
  );

  const totals = useMemo(() => {
    const tasks = data?.tasks ?? [];
    return {
      done: tasks.filter((t) => t.completed).length,
      total: tasks.length,
    };
  }, [data]);

  // Stany alternatywne — empty / forbidden / not-found / error / loading
  if (orderId == null) {
    // Brak orderId — sprawdź czy faktycznie nie ma przypisanych zamówień.
    const noOrders = !ordersLoading && (ordersList?.length ?? 0) === 0;
    return (
      <div className="content-max">
        <WorkerEmptyState
          reason={noOrders ? "no-orders" : "no-selection"}
        />
      </div>
    );
  }

  if (error instanceof ApiError) {
    if (error.status === 403) {
      return (
        <div className="content-max">
          <WorkerEmptyState reason="forbidden" />
        </div>
      );
    }
    if (error.status === 404) {
      return (
        <div className="content-max">
          <WorkerEmptyState reason="not-found" />
        </div>
      );
    }
    return (
      <div className="content-max">
        <WorkerEmptyState
          reason="error"
          message={error.message || `Błąd ${error.status}`}
          onRetry={() => mutate()}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-max">
        <WorkerEmptyState
          reason="error"
          message="Nie udało się połączyć z backendem."
          onRetry={() => mutate()}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="content-max" aria-busy="true" aria-live="polite">
        <span className="sr-only">Ładuję zamówienie…</span>
        <div className="worker-empty">
          <div className="worker-empty-icon" aria-hidden="true">
            <span className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%" }} />
          </div>
          <span
            className="skeleton skel-text lg"
            style={{ width: 220, marginBottom: 6 }}
          />
          <span className="skeleton skel-text" style={{ width: 320 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="content-max">
      <OrderHeader order={data} />

      <div className="work-grid">
        <div className="col-stack">
          <ProgressCard
            done={totals.done}
            total={totals.total}
            syncing={syncing}
          />
          <TaskList
            tasks={data.tasks}
            onToggle={onToggleTask}
            filter={filter}
            onFilterChange={setFilter}
            bumpingId={bumpingId}
            glowingId={glowingId}
          />
        </div>
        <div className="col-stack">
          <OrderInfo order={data} />
          <NotesCard
            orderId={data.id}
            initialNotes={data.productionNotes}
          />
          <MiniTimeline order={data} />
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} onUndo={undoToast} />

      {showCelebration && data && (
        <CelebrationModal
          orderId={data.id}
          customerName={data.customerName}
          onClose={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}
