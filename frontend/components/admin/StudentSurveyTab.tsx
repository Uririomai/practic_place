"use client";

import { Badge } from "@/components/ui/badge";
import { AdminApplication, ApplicationAnswer } from "@/shared/api/types";
import { AlertCircle } from "lucide-react";

interface StudentSurveyTabProps {
  applications: AdminApplication[];
}

function statusBadge(status: string) {
  const s = status?.toLowerCase();
  if (s === "approved") {
    return <Badge className="bg-green-500 hover:bg-green-600">Одобрена</Badge>;
  }
  if (s === "rejected") {
    return <Badge variant="destructive">Отклонена</Badge>;
  }
  return <Badge variant="secondary">Ожидание</Badge>;
}

export function StudentSurveyTab({ applications }: StudentSurveyTabProps) {
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
        // Сортируем ответы по order поля
        const answers = (app.answers || []).sort(
          (a, b) => (a.field.order ?? 0) - (b.field.order ?? 0)
        );

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
                {statusBadge(app.status)}
              </div>
            </div>

            {/* Данные анкеты */}
            <div className="p-4">
              {answers.length > 0 ? (
                <div className="grid gap-4">
                  {answers.map((answer: ApplicationAnswer) => (
                    <div key={answer.id}>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {answer.field.label}
                      </p>
                      {answer.field.type === "TEXTAREA" ? (
                        <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                          {answer.value || "—"}
                        </div>
                      ) : (
                        <p className="text-sm font-medium">
                          {answer.value || "—"}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Данные анкеты не заполнены
                </p>
              )}
            </div>

            {/* Комментарий при отклонении */}
            {app.reviewComment && (
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
