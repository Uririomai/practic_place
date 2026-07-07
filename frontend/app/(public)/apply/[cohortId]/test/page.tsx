"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TestTaskView } from "@/components/applications/TestTaskView";
import { TestTask, TestTaskStatus, UserTestTask } from "@/shared/api/types";
import { api } from "@/shared/api/client";

export default function TestPage() {
  const params = useParams();
  const cohortId = params.cohortId as string;
  const [testTask, setTestTask] = useState<TestTask | null>(null);
  const [userTestTask, setUserTestTask] = useState<UserTestTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.testTask.get(cohortId).catch(() => null),
      api.testTask.getMy(cohortId).catch(() => null),
    ])
      .then(([task, userTask]) => {
        setTestTask(task);
        setUserTestTask(userTask);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [cohortId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl py-10 px-4">
        <div className="mb-8">
          <Link
            href={`/apply/${cohortId}/survey`}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← К анкете
          </Link>
          <h1 className="mt-4 text-3xl font-bold">Тестовое задание</h1>
          <p className="mt-2 text-muted-foreground">
            Опишите ваш ответ на предложенное задание
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          {loading && (
            <div className="space-y-4">
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
              <div className="h-24 w-full animate-pulse rounded bg-muted" />
              <div className="h-32 w-full animate-pulse rounded bg-muted" />
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          {!loading && !error && (
            <TestTaskView
              cohortId={cohortId}
              testTask={testTask}
              initialStatus={(userTestTask?.status as TestTaskStatus) || "not_submitted"}
              initialAnswer={userTestTask?.answer}
            />
          )}
        </div>
      </div>
    </div>
  );
}
