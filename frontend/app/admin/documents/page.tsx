"use client";

import { useState, useEffect } from "react";
import { CohortFilter } from "@/components/admin/CohortFilter";
import { DocumentsTable } from "@/components/admin/DocumentsTable";
import { api } from "@/shared/api/client";
import { Cohort, AdminDocumentData, SaveReviewDto } from "@/shared/api/types";

export default function AdminDocumentsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [documents, setDocuments] = useState<AdminDocumentData[]>([]);
  const [selectedCohortIds, setSelectedCohortIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [cohortsData, docsData] = await Promise.all([
        api.cohorts.list(),
        api.admin.getDocuments(),
      ]);
      setCohorts(cohortsData);
      setDocuments(docsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDocs = selectedCohortIds.length > 0
    ? documents.filter((doc) => selectedCohortIds.includes(doc.cohortId))
    : documents;

  const handleSaveReview = async (documentId: string, data: SaveReviewDto) => {
    await api.admin.saveReview(documentId, data);
    await loadData();
  };

  const handleApproveReport = async (documentId: string) => {
    await api.admin.approveReport(documentId);
    await loadData();
  };

  const handleRejectReport = async (documentId: string) => {
    await api.admin.rejectReport(documentId);
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
        <h1 className="text-2xl font-bold">Документы</h1>
        <p className="text-muted-foreground">
          Проверка и утверждение документов студентов
        </p>
      </div>

      <CohortFilter
        cohorts={cohorts}
        selectedIds={selectedCohortIds}
        onChange={setSelectedCohortIds}
      />

      <DocumentsTable
        documents={filteredDocs}
        onSaveReview={handleSaveReview}
        onApproveReport={handleApproveReport}
        onRejectReport={handleRejectReport}
      />
    </div>
  );
}
