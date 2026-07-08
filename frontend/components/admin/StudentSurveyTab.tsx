"use client";

import { Badge } from "@/components/ui/badge";
import { AdminApplication } from "@/shared/api/types";

interface StudentSurveyTabProps {
  applications: AdminApplication[];
}

const fieldLabels: Record<string, string> = {
  fio: "ФИО",
  group: "Группа",
  course: "Курс",
  desired_role: "Желаемая роль",
  tech_stack: "Технологии",
};

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
      {applications.map((app) => (
        <div key={app.id} className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">{app.cohort.name}</h3>
            <Badge variant={
              app.status === "approved" ? "default" :
              app.status === "rejected" ? "destructive" : "secondary"
            }>
              {app.status === "approved" ? "Одобрена" :
               app.status === "rejected" ? "Отклонена" : "Ожидание"}
            </Badge>
          </div>

          <div className="space-y-2">
            {Object.entries(app.surveyData || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b last:border-0">
                <span className="text-sm text-muted-foreground">
                  {fieldLabels[key] || key}
                </span>
                <span className="text-sm font-medium">{value || "—"}</span>
              </div>
            ))}
          </div>

          {app.reviewComment && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
              <span className="font-medium">Комментарий:</span> {app.reviewComment}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
