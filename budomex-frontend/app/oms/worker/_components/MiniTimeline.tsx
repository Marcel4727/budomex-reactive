import Icon from "../../_components/Icon";
import type { WorkerOrderDetail } from "../_hooks/useWorkerOrderDetail";
import type { BackendOrderStatus } from "../../manager/_components/_data";

type StepState = "done" | "current" | "pending";

type Step = {
  label: string;
  state: StepState;
};

const SEQUENCE: BackendOrderStatus[] = [
  "OCZEKUJACE",
  "ZAAKCEPTOWANE_PRZEZ_MISTRZA",
  "W_REALIZACJI",
  "ZREALIZOWANE",
  "MONTAZ",
  "KONIEC",
];

function indexFor(status: string): number {
  const idx = SEQUENCE.indexOf(status as BackendOrderStatus);
  if (idx >= 0) return idx;
  return 0;
}

function buildSteps(order: WorkerOrderDetail): Step[] {
  const currentIdx = indexFor(order.status);
  const labels = [
    "Zaakceptowane",
    "W realizacji",
    "Zrealizowane",
    "Montaż / odbiór",
  ];
  const map = [1, 2, 3, 4];

  return labels.map((label, i) => {
    const seqIdx = map[i];
    let state: StepState;
    if (currentIdx > seqIdx) state = "done";
    else if (currentIdx === seqIdx || (i === 3 && currentIdx >= 4))
      state = "current";
    else state = "pending";
    return { label, state };
  });
}

export default function MiniTimeline({ order }: { order: WorkerOrderDetail }) {
  const steps = buildSteps(order);
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <h3 className="card-title">Status zamówienia</h3>
        </div>
      </div>
      <div className="mini-timeline">
        {steps.map((s, i) => (
          <div key={i} className={`mini-step ${s.state}`}>
            <div className="ms-dot">
              {s.state === "done" && (
                <Icon name="check" size={12} strokeWidth={3} />
              )}
              {s.state === "current" && (
                <Icon name="rotate-cw" size={11} strokeWidth={2.5} />
              )}
            </div>
            <span className="ms-label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
