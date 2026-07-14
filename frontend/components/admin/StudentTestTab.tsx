"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { AdminApplication, TestTask } from "@/shared/api/types";
import { api } from "@/shared/api/client";
import { AlertCircle } from "lucide-react";

interface StudentTestTabProps {
  applications: AdminApplication[];
}

function statusBadge(status?: string, hasAnswer?: boolean) {
  const s = status?.toLowerCase();
  if (s === "approved") {
    return <Badge className="bg-green-500 hover:bg-green-600">Одобрен</Badge>;
  }
  if (s === "rejected") {
    return <Badge variant="destructive">Отклонён</Badge>;
  }
  if (hasAnswer) {
    return <Badge className="bg-yellow-500 hover:bg-yellow-600">Ожидает проверки</Badge>;
  }
  if (s === "test_assigned") {
    return <Badge variant="outline">Ожидает прохождения</Badge>;
  }
  return <Badge variant="secondary">Не отправлен</Badge>;
}

export function StudentTestTab({ applications }: StudentTestTabProps) {
  const [testTasks, setTestTasks] = useState<Record<string, TestTask>>({});

  useEffect(() => {
    const loadTasks = async () => {
      const uniqueCohortIds = [...new Set(applications.map(a => a.cohortId))];
      const tasks: Record<string, TestTask> = {};

      await Promise.all(
        uniqueCohortIds.map(async (cohortId) => {
          try {
            const allTasks = await api.testTask.get(cohortId);
            for (const t of allTasks) {
              tasks[`${cohortId}:${t.roleId}`] = t;
            }
          } catch {
            // нет тестов для этой когорты
          }
        })
      );

      setTestTasks(tasks);
    };

    if (applications.length > 0) {
      loadTasks();
    }
  }, [applications]);

  const getTaskForApp = (app: AdminApplication): TestTask | undefined => {
    if (app.roleId) {
      return testTasks[`${app.cohortId}:${app.roleId}`];
    }
    const key = Object.keys(testTasks).find(k => k.startsWith(app.cohortId + ":"));
    return key ? testTasks[key] : undefined;
  };

  if (applications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Заявок не найдено
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {applications.map((app) => {
        const task = getTaskForApp(app);
        return (
          <div key={app.id} className="rounded-lg border overflow-hidden">
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
              <div>
                <h3 className="font-semibold text-lg">{app.cohort?.name || "Когорта"}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                  <span>
                    Заявка: {new Date(app.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                  {app.cohort?.applicationStart && app.cohort?.applicationEnd && (
                    <span>
                      Подача заявок: {new Date(app.cohort.applicationStart).toLocaleDateString("ru-RU")} — {new Date(app.cohort.applicationEnd).toLocaleDateString("ru-RU")}
                    </span>
                  )}
                  {app.cohort?.practiceStart && app.cohort?.practiceEnd && (
                    <span>
                      Практика: {new Date(app.cohort.practiceStart).toLocaleDateString("ru-RU")} — {new Date(app.cohort.practiceEnd).toLocaleDateString("ru-RU")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {app.role?.name && (
                  <Badge variant="outline" className="text-sm">
                    {app.role.name}
                  </Badge>
                )}
                {statusBadge(app.testStatus, !!app.testAnswer)}
              </div>
            </div>

            {/* Содержимое */}
            <div className="p-4 space-y-4">
              {/* Тестовое задание */}
              {task && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Тестовое задание
                  </p>
                  <div className="rounded-md bg-primary/5 border p-3 text-sm whitespace-pre-wrap">
                    {task.content}
                  </div>
                </div>
              )}

              {/* Ответ студента */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Ответ студента
                </p>
                {app.testAnswer ? (
                  <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                    {app.testAnswer}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>

            {/* Комментарий при отклонении */}
            {app.reviewComment && app.testStatus?.toLowerCase() === "rejected" && (
              <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">Причина отклонения:</p>
                  <p className="text-sm text-red-600">{app.reviewComment}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
