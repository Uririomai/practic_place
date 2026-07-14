"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Application, ApplicationFile } from "@/shared/api/types";
import { api } from "@/shared/api/client";
import { ChevronLeft, ChevronRight, Search, CheckCircle2, XCircle, Clock, Download } from "lucide-react";

interface DocumentsTableProps {
  applications: (Application & { files?: ApplicationFile[] })[];
  onRefresh: () => void;
}

const ITEMS_PER_PAGE = 25;

export function DocumentsTable({ applications, onRefresh }: DocumentsTableProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<(Application & { files?: ApplicationFile[] }) | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const filtered = applications.filter((app) => {
    if (search && !app.user?.email?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const getReportFile = (app: Application & { files?: ApplicationFile[] }) =>
    app.files?.find((f) => f.type === "REPORT");

  const reportStatusIcon = (status?: string) => {
    if (!status) return <XCircle className="h-5 w-5 text-red-500" />;
    if (status === "APPROVED") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (status === "REJECTED") return <XCircle className="h-5 w-5 text-red-500" />;
    return <Clock className="h-5 w-5 text-yellow-600" />;
  };

  const handleApprove = async (applicationId: string) => {
    setActionLoading(true);
    try {
      await api.admin.approveReport(applicationId);
      onRefresh();
      setSelectedApp(null);
    } catch (err) {
      console.error("Ошибка одобрения:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (applicationId: string) => {
    setActionLoading(true);
    try {
      await api.admin.rejectReport(applicationId, "Отчёт не соответствует требованиям");
      onRefresh();
      setSelectedApp(null);
    } catch (err) {
      console.error("Ошибка отклонения:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadReport = async (applicationId: string) => {
    try {
      const blob = await api.documents.downloadReport(applicationId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${applicationId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Ошибка скачивания:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Поиск */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
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
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Когорта</th>
              <th className="px-4 py-3 text-center font-medium">Статус заявки</th>
              <th className="px-4 py-3 text-center font-medium">Отчёт</th>
              <th className="px-4 py-3 text-center font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Заявок не найдено
                </td>
              </tr>
            ) : (
              paginated.map((app) => {
                const report = getReportFile(app);
                return (
                  <tr
                    key={app.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedApp(app)}
                  >
                    <td className="px-4 py-3 font-medium">{app.user?.email || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{app.cohort?.name || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={app.status?.toUpperCase() === "APPROVED" ? "default" : app.status?.toUpperCase() === "REJECTED" ? "destructive" : "secondary"}>
                        {app.status?.toUpperCase() === "APPROVED" ? "Одобрена" : app.status?.toUpperCase() === "REJECTED" ? "Отклонена" : "На проверке"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {reportStatusIcon(report?.status)}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {report?.status === "PENDING" && (
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 h-7"
                            onClick={() => handleApprove(app.id)}
                            disabled={actionLoading}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ок
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7"
                            onClick={() => handleReject(app.id)}
                            disabled={actionLoading}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Нет
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
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
      {selectedApp && (
        <Dialog open onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Отчёт: {selectedApp.user?.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Когорта:</span>
                  <span>{selectedApp.cohort?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Статус заявки:</span>
                  <Badge variant={selectedApp.status?.toUpperCase() === "APPROVED" ? "default" : "secondary"}>
                    {selectedApp.status}
                  </Badge>
                </div>
              </div>

              {/* Отчёт */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium text-sm">Отчёт о практике</h4>
                {(() => {
                  const report = getReportFile(selectedApp);
                  if (!report) {
                    return (
                      <div className="text-center py-4 text-muted-foreground">
                        <XCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        Отчёт не загружен
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span>Статус:</span>
                        <Badge variant={report.status === "APPROVED" ? "default" : report.status === "REJECTED" ? "destructive" : "secondary"}>
                          {report.status === "APPROVED" ? "Одобрен" : report.status === "REJECTED" ? "Отклонён" : "На проверке"}
                        </Badge>
                        {report.comment && (
                          <span className="text-muted-foreground">— {report.comment}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReport(selectedApp.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Скачать
                        </Button>
                        {report.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove(selectedApp.id)}
                              disabled={actionLoading}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Одобрить
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReject(selectedApp.id)}
                              disabled={actionLoading}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Отклонить
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
