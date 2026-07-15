"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineRoleSelect } from "./InlineRoleSelect";
import { ApplicationReviewModal } from "./ApplicationReviewModal";
import { AdminApplication, Cohort, CohortRole, TestTask } from "@/shared/api/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ApplicationsTableProps {
  applications: AdminApplication[];
  cohorts: Cohort[];
  cohortRoles: Record<string, CohortRole[]>;
  cohortTests: Record<string, TestTask[]>;
  onApprove: (id: string, roleId: string) => Promise<void>;
  onReject: (id: string, comment: string) => Promise<void>;
  onRoleChange: (id: string, roleId: string) => Promise<void>;
  onTestReviewed?: () => void;
}

const ITEMS_PER_PAGE = 25;

export function ApplicationsTable({
  applications,
  cohorts,
  cohortRoles,
  cohortTests,
  onApprove,
  onReject,
  onRoleChange,
  onTestReviewed,
}: ApplicationsTableProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewApp, setReviewApp] = useState<AdminApplication | null>(null);

  const filtered = applications.filter((app) => {
    if (statusFilter === "all") return true;
    const status = app.status?.toLowerCase();
    if (statusFilter === "pending") {
      // "Ожидание" — анкета на проверке ИЛИ тест назначен/ожидает проверки
      return status === "pending" || status === "test_assigned" || !!app.testAnswer;
    }
    return status === statusFilter;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const statusBadge = (app: AdminApplication) => {
    const s = app.status?.toLowerCase();
    if (s === "rejected") {
      return <Badge variant="destructive">Отклонена</Badge>;
    }
    // Роль назначена = анкета одобрена
    if (app.roleId) {
      return <Badge className="bg-green-500 hover:bg-green-600">Одобрена</Badge>;
    }
    return <Badge variant="secondary">Ожидание</Badge>;
  };

  const testStatusBadge = (app: AdminApplication) => {
    if (!app.roleId) return <span className="text-muted-foreground">—</span>;
    const s = app.status?.toLowerCase();
    if (s === "approved")
      return <Badge className="bg-green-500 hover:bg-green-600">Одобрен</Badge>;
    if (s === "rejected")
      return <Badge variant="destructive">Не прошёл</Badge>;
    if (app.testAnswer)
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Ожидает проверки</Badge>;
    // Проверяем, есть ли тестовое задание на эту роль в когорте
    const tests = cohortTests[app.cohortId] || [];
    const hasTest = tests.some((t) => t.roleId === app.roleId);
    if (!hasTest)
      return <Badge variant="destructive">Необходимо добавить тест</Badge>;
    return <Badge variant="outline">Ожидает прохождения</Badge>;
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
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
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
                  <td className="px-4 py-3">{app.cohort?.name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{app.user.email}</td>
                  <td className="px-4 py-3">
                    {new Date(app.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-4 py-3">{statusBadge(app)}</td>
                  <td className="px-4 py-3">{testStatusBadge(app)}</td>
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
          onTestReviewed={onTestReviewed}
        />
      )}
    </div>
  );
}