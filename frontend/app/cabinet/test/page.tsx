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
  const [cohortId, setCohortId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) {
      setError("Не указан ID заявки");
      setLoading(false);
      return;
    }

    // Загружаем заявку через GET /applications/:id, оттуда получаем cohortId и roleId
    api.admin.getApplication(applicationId)
      .then((data) => {
        const cid = data.cohortId;
        const roleId = data.roleId || data.role?.id;
        setCohortId(cid);
        // Пробуем загрузить тестовое задание для когорты
        return api.testTask.get(cid)
          .then((tasks) => {
            // Находим тестовое задание, соответствующее роли студента
            const matchedTask = roleId
              ? tasks.find(t => t.roleId === roleId) ?? tasks[0] ?? null
              : tasks[0] ?? null;
            setTestTask(matchedTask);
          })
          .catch(() => {
            // Если тест не загрузился — показываем заглушку
            setTestTask({
              id: "unknown",
              cohortId: cid,
              roleId: roleId || "",
              content: "Тестовое задание пока не доступно. Обратитесь к администратору.",
            });
          });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Не удалось загрузить данные заявки");
      })
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
            applicationId={applicationId || ""}
            testTask={testTask}
            initialStatus="not_submitted"
            initialAnswer=""
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
