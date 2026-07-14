"use client";

import { useState, useEffect, useCallback } from "react";
import { CohortFilter } from "@/components/admin/CohortFilter";
import { DocumentsTable } from "@/components/admin/DocumentsTable";
import { api } from "@/shared/api/client";
import { Cohort, AdminDocumentData, CohortStudent } from "@/shared/api/types";

export default function AdminDocumentsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [documents, setDocuments] = useState<AdminDocumentData[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // Загрузка документов для когорты
  const loadDocuments = useCallback(async (cohortId: string) => {
    setSwitching(true);
    try {
      // Получаем студентов когорты
      const students = await api.cohorts.getStudents(cohortId);

      // Для каждого студента загружаем документы и отчёт
      const docs = await Promise.all(
        students.map(async (s) => {
          const base: AdminDocumentData = {
            user: {
              id: s.user.id,
              email: s.user.email,
              fio: s.user.profile?.student_fio || s.user.email,
            },
            applicationId: s.application.id,
            cohort: { id: cohortId, name: "" },
            role: s.application.role,
          };

          try {
            // ИЗ
            const iz = await api.studentDocument.get(s.application.id);
            base.iz = iz;
          } catch {}

          try {
            // Заявка с файлами
            const app = await api.admin.getApplication(s.application.id);
            base.cohort = app.cohort || base.cohort;
            const report = app.files?.find((f) => f.type === "REPORT");
            if (report) base.report = report;
          } catch {}

          try {
            // Доступные документы
            const docs = await api.documents.list(s.application.id);
            base.documents = docs;
          } catch {}

          try {
            // Отзыв — загружаем из doc-data
            const docData = await api.studentDocument.get(s.application.id);
            base.review = {
              id: docData.id,
              applicationId: s.application.id,
              review_activities: (docData as any).review_activities || "",
              review_characteristic: (docData as any).review_characteristic || "",
              review_employed: (docData as any).review_employed || false,
              review_next_practice: (docData as any).review_next_practice || false,
              review_employment_offer: (docData as any).review_employment_offer || false,
              review_suggestions: (docData as any).review_suggestions || "",
              review_grade: (docData as any).review_grade || "",
            };
          } catch {}

          return base;
        })
      );

      setDocuments(docs);
    } catch (err) {
      console.error("Ошибка загрузки документов:", err);
      setDocuments([]);
    } finally {
      setSwitching(false);
    }
  }, []);

  // Загрузка списка когорт
  useEffect(() => {
    api.cohorts
      .list()
      .then((data) => {
        setCohorts(data);
        if (data.length > 0) {
          setSelectedCohortId(data[0].id);
          loadDocuments(data[0].id);
        }
      })
      .catch(() => setCohorts([]))
      .finally(() => setLoading(false));
  }, [loadDocuments]);

  const handleCohortChange = useCallback(
    (cohortId: string) => {
      setSelectedCohortId(cohortId);
      loadDocuments(cohortId);
    },
    [loadDocuments]
  );

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
          Просмотр отчётов и документов студентов
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
          documents={documents}
          onRefresh={() => selectedCohortId && loadDocuments(selectedCohortId)}
        />
      )}
    </div>
  );
}
