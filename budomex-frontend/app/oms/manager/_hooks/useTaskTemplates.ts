"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";

export type ExistingTask = {
  id: number;
  description: string;
  completed: boolean | null;
};

export type TaskTemplatesResponse = {
  templates: string[];
  existingTasks: ExistingTask[];
};

export function useTaskTemplates(orderId: number | null) {
  return useSWR<TaskTemplatesResponse>(
    orderId != null ? `/api/manager/order/${orderId}/task-templates` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );
}
