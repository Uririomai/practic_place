"use client";

import { Badge } from "@/components/ui/badge";
import { AdminApplication } from "@/shared/api/types";
import { CheckCircle2, XCircle, Clock, FileText } from "lucide-react";

interface StudentTestTabProps {
  applications: AdminApplication[];
}

export function StudentTestTab({ applications }: StudentTestTabProps) {
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
            <TestStatusBadge status={app.testStatus} />
          </div>

          {app.testAnswer ? (
            <div className="rounded-lg bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                Ответ на тестовое задание
              </div>
              <p className="text-sm whitespace-pre-wrap">{app.testAnswer}</p>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Ответ не отправлен
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TestStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-500">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Одобрен
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Отклонён
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
          <Clock className="h-3 w-3 mr-1" />
          На проверке
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          Не отправлен
        </Badge>
      );
  }
}
