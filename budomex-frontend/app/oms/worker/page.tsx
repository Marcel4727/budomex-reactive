"use client";

import { useSearchParams } from "next/navigation";
import WorkerPanel from "./_components/WorkerPanel";
import { usePageTitle } from "../_components/usePageTitle";
import { formatRef } from "../manager/_components/_data";

export default function Page() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("orderId");
  const orderId = raw ? Number(raw) : null;
  const valid = orderId != null && Number.isFinite(orderId);
  usePageTitle(
    valid ? `${formatRef(orderId)} · Budomex OMS` : "Panel pracownika · Budomex OMS",
  );
  return <WorkerPanel orderId={valid ? orderId : null} />;
}
