"use client";

import { api } from "@/lib/api";

type MutationResponse = {
  message: string;
  completionPercentage?: number;
  orderStatus?: string;
};

export function completeTask(taskId: number) {
  return api<MutationResponse>(`/api/worker/task/${taskId}/complete`, {
    method: "POST",
  });
}

export function revertTask(taskId: number) {
  return api<MutationResponse>(`/api/worker/task/${taskId}/revert`, {
    method: "POST",
  });
}

export function saveProductionNotes(orderId: number, notes: string) {
  return api<{ message: string }>(`/api/worker/order/${orderId}/notes`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}
