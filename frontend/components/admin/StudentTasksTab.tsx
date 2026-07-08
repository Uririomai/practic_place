"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskCard, Cohort } from "@/shared/api/types";
import { ExternalLink, Clock, Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

interface StudentTasksTabProps {
  tasksByCohort: Record<string, TaskCard[]>;
  selectedCohortId: string;
}

export function StudentTasksTab({ tasksByCohort, selectedCohortId }: StudentTasksTabProps) {
  const [viewingTask, setViewingTask] = useState<TaskCard | null>(null);

  // Фильтрация по выбранной когорте
  const cohortsToShow = selectedCohortId === "all"
    ? Object.entries(tasksByCohort)
    : Object.entries(tasksByCohort).filter(([cohortId]) => cohortId === selectedCohortId);

  if (cohortsToShow.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Задач не найдено
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {cohortsToShow.map(([cohortId, tasks]) => (
        <div key={cohortId}>
          <h3 className="font-medium mb-3">
            Задачи ({tasks.length})
          </h3>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Дата</th>
                  <th className="px-4 py-2 text-left font-medium">Задача</th>
                  <th className="px-4 py-2 text-left font-medium">Описание</th>
                  <th className="px-4 py-2 text-center font-medium">Артефакт</th>
                  <th className="px-4 py-2 text-right font-medium">Обновлено</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => setViewingTask(task)}
                    className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                  >
                    <td className="px-4 py-2">
                      {format(parseISO(task.date), "d MMMM yyyy", { locale: ru })}
                    </td>
                    <td className="px-4 py-2 font-medium">{task.title}</td>
                    <td className="px-4 py-2 text-muted-foreground max-w-[200px] truncate">
                      {task.description || "—"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {task.artifact_link ? (
                        <ExternalLink className="h-4 w-4 text-primary" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(task.updated_at), "d MMM, HH:mm", { locale: ru })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Модалка просмотра задачи */}
      <Dialog open={!!viewingTask} onOpenChange={() => setViewingTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewingTask?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Дата */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>{viewingTask ? format(parseISO(viewingTask.date), "d MMMM yyyy, EEEE", { locale: ru }) : ""}</span>
            </div>

            {/* Описание */}
            {viewingTask?.description && (
              <div>
                <label className="text-sm font-medium">Описание</label>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {viewingTask.description}
                </p>
              </div>
            )}

            {/* Артефакт */}
            {viewingTask?.artifact_link && (
              <div>
                <label className="text-sm font-medium">Артефакт</label>
                <a
                  href={viewingTask.artifact_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  {viewingTask.artifact_link}
                </a>
              </div>
            )}

            {/* Время обновления */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Clock className="h-3 w-3" />
              <span>Обновлено: {viewingTask ? format(parseISO(viewingTask.updated_at), "d MMMM, HH:mm", { locale: ru }) : ""}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
