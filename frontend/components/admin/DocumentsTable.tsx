"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DocumentReviewModal } from "./DocumentReviewModal";
import { AdminDocumentData, SaveReviewDto } from "@/shared/api/types";
import { ChevronLeft, ChevronRight, Search, CheckCircle2, XCircle, Clock } from "lucide-react";

interface DocumentsTableProps {
  documents: AdminDocumentData[];
  onSaveReview: (documentId: string, data: SaveReviewDto) => Promise<void>;
  onApproveReport: (documentId: string) => Promise<void>;
  onRejectReport: (documentId: string) => Promise<void>;
}

const ITEMS_PER_PAGE = 25;

export function DocumentsTable({
  documents,
  onSaveReview,
  onApproveReport,
  onRejectReport,
}: DocumentsTableProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [reviewDoc, setReviewDoc] = useState<AdminDocumentData | null>(null);

  const filtered = documents.filter((doc) => {
    if (search && !doc.user.fio.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const checkmark = (value: boolean) =>
    value ? (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      </span>
    ) : (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100">
        <XCircle className="h-5 w-5 text-red-500" />
      </span>
    );

  const reportStatus = (doc: AdminDocumentData) => {
    if (!doc.report_file_url) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100">
          <XCircle className="h-5 w-5 text-red-500" />
        </span>
      );
    }
    if (doc.report_admin_approved) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100">
        <Clock className="h-5 w-5 text-yellow-600" />
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Поиск */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по ФИО..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filtered.length} студентов
        </span>
      </div>

      {/* Таблица */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">ФИО</th>
              <th className="px-4 py-3 text-left font-medium">Когорта</th>
              <th className="px-4 py-3 text-center font-medium">ИЗ</th>
              <th className="px-4 py-3 text-center font-medium">Отзыв</th>
              <th className="px-4 py-3 text-center font-medium">Титул</th>
              <th className="px-4 py-3 text-center font-medium">Отчёт</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Студентов не найдено
                </td>
              </tr>
            ) : (
              paginated.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => setReviewDoc(doc)}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium">{doc.user.fio}</td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.cohort.name}</td>
                  <td className="px-4 py-3 text-center">
                    {checkmark(!!(doc.student_fio && doc.group && doc.direction_code))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {checkmark(!!doc.review_activities)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {checkmark(doc.report_admin_approved)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {reportStatus(doc)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Страница {page} из {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Модалка просмотра */}
      {reviewDoc && (
        <DocumentReviewModal
          document={reviewDoc}
          onClose={() => setReviewDoc(null)}
          onSaveReview={onSaveReview}
          onApproveReport={onApproveReport}
          onRejectReport={onRejectReport}
        />
      )}
    </div>
  );
}
