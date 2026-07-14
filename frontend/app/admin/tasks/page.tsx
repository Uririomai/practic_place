"use client";

import { useState, useEffect, useCallback } from "react";
import { CohortFilter } from "@/components/admin/CohortFilter";
import { AdminTasksView } from "@/components/admin/AdminTasksView";
import { api } from "@/shared/api/client";
import { Cohort } from "@/shared/api/types";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export default function AdminTasksPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await api.cohorts.list();
        setCohorts(data);
        if (data.length > 0) {
          handleCohortChange(data[0].id);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleCohortChange = useCallback(async (cohortId: string) => {
    setSelectedCohortId(cohortId);
    try {
      await api.auth.updateActiveCohort(cohortId);
    } catch (e) {
      console.error("Ошибка смены когорты:", e);
    }
  }, []);

  const selectedCohort = cohorts.find((c) => c.id === selectedCohortId);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Задачи</h1>
        <p className="text-muted-foreground">
          Просмотр задач студентов по неделям
        </p>
      </div>

      <CohortFilter
        cohorts={cohorts}
        selectedId={selectedCohortId}
        onChange={handleCohortChange}
      />

      {!selectedCohort ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            Выберите когорту для просмотра задач
          </p>
        </div>
      ) : (
        <div key={selectedCohort.id} className="space-y-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-semibold">{selectedCohort.name}</h2>
            <span className="text-sm text-muted-foreground">
              {format(parseISO(selectedCohort.practiceStart), "d MMMM", { locale: ru })} — {format(parseISO(selectedCohort.practiceEnd), "d MMMM yyyy", { locale: ru })}
            </span>
          </div>
          <AdminTasksView cohort={selectedCohort} />
        </div>
      )}
    </div>
  );
}
