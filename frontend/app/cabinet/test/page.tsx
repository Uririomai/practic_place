"use client";

import { useEffect, useState } from "react";
import { TestTaskView } from "@/components/applications/TestTaskView";
import { TestTask, TestTaskStatus, UserTestTask } from "@/shared/api/types";
import { api } from "@/shared/api/client";

export default function TestPage() {
  const [testTask, setTestTask] = useState<TestTask | null>(null);
  const [userTestTask, setUserTestTask] = useState<UserTestTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.testTask.get("test-cohort-id").catch(() => null),
      api.testTask.getMy("test-cohort-id").catch(() => null),
    ])
      .then(([task, userTask]) => {
        setTestTask(task);
        setUserTestTask(userTask);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Тестовое задание</h2>
        <p className="text-muted-foreground">
          Опишите ваш ответ на предложенное задание
        </p>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-24 w-full animate-pulse rounded bg-muted" />
          <div className="h-32 w-full animate-pulse rounded bg-muted" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <TestTaskView
            cohortId="test-cohort-id"
            testTask={testTask}
            initialStatus={(userTestTask?.status as TestTaskStatus) || "not_submitted"}
            initialAnswer={userTestTask?.answer}
          />
        </div>
      )}
    </div>
  );
}
