"use client";

import { useState, useEffect } from "react";
import { CohortFilter } from "@/components/admin/CohortFilter";
import { ApplicationsTable } from "@/components/admin/ApplicationsTable";
import { api } from "@/shared/api/client";
import { Cohort, AdminApplication, CohortRole } from "@/shared/api/types";

export default function AdminApplicationsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [cohortRoles, setCohortRoles] = useState<Record<string, CohortRole[]>>({});
  const [selectedCohortIds, setSelectedCohortIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [cohortsData, appsData] = await Promise.all([
        api.cohorts.list(),
        api.admin.getApplications(),
      ]);
      setCohorts(cohortsData);
      setApplications(appsData);

      // Загружаем роли для каждой когорты
      const rolesMap: Record<string, CohortRole[]> = {};
      for (const cohort of cohortsData) {
        try {
          const roles = await api.admin.getRoles(cohort.id);
          rolesMap[cohort.id] = roles;
        } catch {
          rolesMap[cohort.id] = [];
        }
      }
      setCohortRoles(rolesMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredApps = selectedCohortIds.length > 0
    ? applications.filter((app) => selectedCohortIds.includes(app.cohortId))
    : applications;

  const handleApprove = async (id: string, roleId: string) => {
    await api.admin.reviewApplication(id, { status: "APPROVED", roleId });
    await loadData();
  };

  const handleReject = async (id: string, comment: string) => {
    await api.admin.reviewApplication(id, { status: "REJECTED", reviewComment: comment });
    await loadData();
  };

  const handleRoleChange = async (id: string, roleId: string) => {
    // Изменение роли уже произошло в handleApprove, здесь просто обновляем список
    await loadData();
  };

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
        <h1 className="text-2xl font-bold">Заявки</h1>
        <p className="text-muted-foreground">
          Просмотр и одобрение заявок студентов
        </p>
      </div>

      <CohortFilter
        cohorts={cohorts}
        selectedIds={selectedCohortIds}
        onChange={setSelectedCohortIds}
      />

      <ApplicationsTable
        applications={filteredApps}
        cohorts={cohorts}
        cohortRoles={cohortRoles}
        onApprove={handleApprove}
        onReject={handleReject}
        onRoleChange={handleRoleChange}
      />
    </div>
  );
}
