"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TestTaskView } from "@/components/applications/TestTaskView";
import { TestTask, TestTaskStatus, UserTestTask } from "@/shared/api/types";
import { api } from "@/shared/api/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";

function TestPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("applicationId");

  const [testTask, setTestTask] = useState<TestTask | null>(null);
  const [userTestTask, setUserTestTask] = useState<UserTestTask | null>(null);
  const [cohortId, setCohortId] = useState<string>("test-cohort-id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Если есть applicationId — загружаем данные заявки для получения cohortId
    // Для мока используем test-cohort-id
    const cid = "test-cohort-id";
    setCohortId(cid);

    Promise.all([
      api.testTask.get(cid).catch(() => null),
      api.testTask.getMy(cid).catch(() => null),
    ])
      .then(([task, userTask]) => {
        setTestTask(task);
        setUserTestTask(userTask);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [applicationId]);

  return (
    <div className="space-y-6">
      {/* Кнопка «Назад» */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/cabinet/applications")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к заявкам
      </Button>

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
            cohortId={cohortId}
            testTask={testTask}
            initialStatus={(userTestTask?.status as TestTaskStatus) || "not_submitted"}
            initialAnswer={userTestTask?.answer}
          />
        </div>
      )}
    </div>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-24 w-full animate-pulse rounded bg-muted" />
      </div>
    }>
      <TestPageContent />
    </Suspense>
  );
}
