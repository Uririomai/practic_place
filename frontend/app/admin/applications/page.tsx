"use client";

import { useState, useEffect, useCallback } from "react";
import { CohortFilter } from "@/components/admin/CohortFilter";
import { ApplicationsTable } from "@/components/admin/ApplicationsTable";
import { api } from "@/shared/api/client";
import { Cohort, AdminApplication, CohortRole, CohortStudent, TestTask } from "@/shared/api/types";

const COHORT_STORAGE_KEY = "admin_selected_cohort";

export default function AdminApplicationsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [cohortRoles, setCohortRoles] = useState<Record<string, CohortRole[]>>({});
  const [cohortTests, setCohortTests] = useState<Record<string, TestTask[]>>({});
  const [studentsFioMap, setStudentsFioMap] = useState<Record<string, string>>({});
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(COHORT_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const loadApplications = async () => {
    try {
      const appsData = await api.admin.getApplications().catch((e) => {
        console.error("Ошибка загрузки заявок:", e);
        return [] as AdminApplication[];
      });
      setApplications(appsData);
    } catch {}
  };

  const loadCohorts = async () => {
    try {
      const cohortsData = await api.cohorts.list().catch((e) => {
        console.error("Ошибка загрузки когорт:", e);
        return [] as Cohort[];
      });
      setCohorts(cohortsData);

      // Загружаем роли, тесты и студентов для каждой когорты
      const rolesMap: Record<string, CohortRole[]> = {};
      const testsMap: Record<string, TestTask[]> = {};
      const fioMap: Record<string, string> = {};
      for (const cohort of cohortsData) {
        try {
          const roles = await api.admin.getRoles(cohort.id);
          rolesMap[cohort.id] = roles;
        } catch {
          rolesMap[cohort.id] = [];
        }
        try {
          const tests = await api.testTask.get(cohort.id);
          testsMap[cohort.id] = tests;
        } catch {
          testsMap[cohort.id] = [];
        }
        try {
          const students = await api.cohorts.getStudents(cohort.id);
          for (const s of students) {
            if (s.user.profile?.student_fio) {
              fioMap[s.user.id] = s.user.profile.student_fio;
            }
          }
        } catch {}
      }
      setCohortRoles(rolesMap);
      setCohortTests(testsMap);
      setStudentsFioMap(fioMap);
    } catch {}
  };

  const loadData = async () => {
    await Promise.all([loadCohorts(), loadApplications()]);
    setLoading(false);
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
    try {
      localStorage.setItem(COHORT_STORAGE_KEY, cohortId);
    } catch {}
    setSwitching(true);
    try {
      // Меняем активную когорту на бэке
      await api.auth.updateActiveCohort(cohortId);
      // Перезагружаем заявки для новой когорты
      await loadApplications();
    } catch (e) {
      console.error("Ошибка смены когорты:", e);
    } finally {
      setSwitching(false);
    }
  }, []);

  const handleApprove = async (id: string, roleId: string) => {
    await api.admin.assignTest(id, roleId);
    await loadApplications();
  };

  const handleReject = async (id: string, comment: string) => {
    await api.admin.reviewApplication(id, { status: "REJECTED", reviewComment: comment });
    await loadApplications();
  };

  const handleRoleChange = async (id: string, roleId: string) => {
    await loadApplications();
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
        selectedId={selectedCohortId}
        onChange={handleCohortChange}
      />

      {switching ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">Загрузка заявок...</p>
        </div>
      ) : (
        <ApplicationsTable
          applications={applications}
          cohorts={cohorts}
          cohortRoles={cohortRoles}
          cohortTests={cohortTests}
          studentsFioMap={studentsFioMap}
          onApprove={handleApprove}
          onReject={handleReject}
          onRoleChange={handleRoleChange}
          onTestReviewed={loadApplications}
        />
      )}
    </div>
  );
}
