"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineRoleSelect } from "./InlineRoleSelect";
import { ApplicationReviewModal } from "./ApplicationReviewModal";
import { AdminApplication, Cohort, CohortRole } from "@/shared/api/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ApplicationsTableProps {
  applications: AdminApplication[];
  cohorts: Cohort[];
  cohortRoles: Record<string, CohortRole[]>;
  onApprove: (id: string, roleId: string) => Promise<void>;
  onReject: (id: string, comment: string) => Promise<void>;
  onRoleChange: (id: string, roleId: string) => Promise<void>;
}

const ITEMS_PER_PAGE = 25;

export function ApplicationsTable({
  applications,
  cohorts,
  cohortRoles,
  onApprove,
  onReject,
  onRoleChange,
}: ApplicationsTableProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewApp, setReviewApp] = useState<AdminApplication | null>(null);

  const filtered = applications.filter((app) => {
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500 hover:bg-green-600">Одобрена</Badge>;
      case "rejected":
        return <Badge variant="destructive">Отклонена</Badge>;
      default:
        return <Badge variant="secondary">Ожидание</Badge>;
    }
  };

  const testStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500 hover:bg-green-600">Одобрен</Badge>;
      case "rejected":
        return <Badge variant="destructive">Не прошёл</Badge>;
      case "pending":
        return <Badge variant="secondary">На проверке</Badge>;
      default:
        return <span className="text-muted-foreground">—</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {[
            { value: "all", label: "Все" },
            { value: "pending", label: "Ожидание" },
            { value: "approved", label: "Одобрены" },
            { value: "rejected", label: "Отклонены" },
          ].map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {filtered.length} заявок
        </span>
      </div>

      {/* Таблица */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Когорта</th>
              <th className="px-4 py-3 text-left font-medium">ФИО</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Дата</th>
              <th className="px-4 py-3 text-left font-medium">Анкета</th>
              <th className="px-4 py-3 text-left font-medium">Тест</th>
              <th className="px-4 py-3 text-left font-medium">Роль</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Заявок не найдено
                </td>
              </tr>
            ) : (
              paginated.map((app) => (
                <tr
                  key={app.id}
                  onClick={() => setReviewApp(app)}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                >
                  <td className="px-4 py-3">{app.cohort.name}</td>
                  <td className="px-4 py-3 font-medium">{app.user.fio || app.user.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{app.user.email}</td>
                  <td className="px-4 py-3">
                    {new Date(app.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-4 py-3">{statusBadge(app.status)}</td>
                  <td className="px-4 py-3">{testStatusBadge(app.testStatus)}</td>
                  <td className="px-4 py-3">
                    <InlineRoleSelect
                      applicationId={app.id}
                      currentRoleId={app.role?.id}
                      roles={cohortRoles[app.cohortId] || []}
                      onChange={onRoleChange}
                    />
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
      {reviewApp && (
        <ApplicationReviewModal
          application={reviewApp}
          roles={cohortRoles[reviewApp.cohortId] || []}
          onClose={() => setReviewApp(null)}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}
    </div>
  );
}