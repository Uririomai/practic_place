"use client";

import { useState, useEffect, useCallback } from "react";
import { CohortFilter } from "@/components/admin/CohortFilter";
import { DocumentsTable } from "@/components/admin/DocumentsTable";
import { api } from "@/shared/api/client";
import { Cohort, Application, ApplicationFile } from "@/shared/api/types";

export default function AdminDocumentsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [applications, setApplications] = useState<(Application & { files?: ApplicationFile[] })[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const loadApplications = async () => {
    try {
      const appsData = await api.admin.getApplicationsWithFiles().catch((e) => {
        console.error("Ошибка загрузки заявок:", e);
        return [] as (Application & { files?: ApplicationFile[] })[];
      });
      setApplications(appsData);
    } catch {}
  };

  const loadData = async () => {
    try {
      const cohortsData = await api.cohorts.list().catch(() => [] as Cohort[]);
      setCohorts(cohortsData);
      await loadApplications();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Автоматически выбираем первую когорту при загрузке
  useEffect(() => {
    if (!loading && cohorts.length > 0 && !selectedCohortId) {
      handleCohortChange(cohorts[0].id);
    }
  }, [loading, cohorts]);

  const handleCohortChange = useCallback(async (cohortId: string) => {
    setSelectedCohortId(cohortId);
    setSwitching(true);
    try {
      await api.auth.updateActiveCohort(cohortId);
      await loadApplications();
    } catch (e) {
      console.error("Ошибка смены когорты:", e);
    } finally {
      setSwitching(false);
    }
  }, []);

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
        <h1 className="text-2xl font-bold">Документы</h1>
        <p className="text-muted-foreground">
          Просмотр отчётов студентов
        </p>
      </div>

      <CohortFilter
        cohorts={cohorts}
        selectedId={selectedCohortId}
        onChange={handleCohortChange}
      />

      {switching ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">Загрузка документов...</p>
        </div>
      ) : (
        <DocumentsTable
          applications={applications}
          onRefresh={loadApplications}
        />
      )}
    </div>
  );
}
