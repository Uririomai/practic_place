"use client";

import { Badge } from "@/components/ui/badge";
import { TaskCard, AdminDocumentData, Cohort } from "@/shared/api/types";
import { CheckCircle2, BookOpen, Award, BarChart3 } from "lucide-react";

interface StudentStatsProps {
  tasks: TaskCard[];
  allTasksCount: number;
  documents: AdminDocumentData[];
  cohorts: Cohort[];
}

export function StudentStats({ tasks, allTasksCount, documents, cohorts }: StudentStatsProps) {
  const completedCount = tasks.filter(t => t.artifactLink).length;
  const completionPercent = allTasksCount > 0
    ? Math.round((completedCount / allTasksCount) * 100)
    : 0;

  const latestGrade = documents[0]?.review_grade || "—";

  const stats = [
    {
      label: "Задач",
      value: tasks.length.toString(),
      subtext: `из ${allTasksCount} всего`,
      icon: BarChart3,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Когорт",
      value: cohorts.length.toString(),
      subtext: "всего",
      icon: BookOpen,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      label: "Оценка",
      value: latestGrade,
      subtext: documents.length > 0 ? "последняя" : "нет данных",
      icon: Award,
      color: "text-yellow-600",
      bg: "bg-yellow-100",
    },
    {
      label: "Выполнено",
      value: `${completedCount} (${completionPercent}%)`,
      subtext: "с артефактом",
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{stat.subtext}</p>
        </div>
      ))}
    </div>
  );
}
