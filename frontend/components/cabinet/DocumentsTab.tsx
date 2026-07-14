"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Upload,
  X,
  File,
} from "lucide-react";
import { api } from "@/shared/api/client";
import { DocumentTemplateAvailability, Application } from "@/shared/api/types";

type DocStatus = "ready" | "pending" | "not_ready";

export function DocumentsTab() {
  const [application, setApplication] = useState<Application | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplateAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Состояние загруженного отчёта
  const [reportFile, setReportFile] = useState<{ name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // Получаем заявку студента, потом загружаем документы
    api.applications.getMy()
      .then((apps) => {
        if (apps.length === 0) {
          setLoading(false);
          return;
        }
        // Берём первую заявку (у студента обычно одна)
        const app = apps[0];
        setApplication(app);
        return api.documents.list(app.id);
      })
      .then((docs) => {
        if (docs) setTemplates(docs);
      })
      .catch(() => {
        setTemplates([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !application) return;

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/pdf",
    ];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedTypes.includes(file.type) && ![".docx", ".pdf"].includes(ext)) {
      showToast("error", "Допустимые форматы: DOCX, PDF");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("error", "Файл слишком большой (максимум 10 МБ)");
      return;
    }

    setUploading(true);
    try {
      await api.documents.uploadReport(application.id, file);
      setReportFile({ name: file.name, size: file.size });
      showToast("success", "Отчёт загружен. Ожидайте проверки администратором.");
    } catch (err) {
      showToast("error", "Ошибка загрузки отчёта");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setReportFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async (templateId: string, name: string) => {
    if (!application) return;
    try {
      const blob = await api.documents.download(application.id, templateId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("error", "Ошибка скачивания документа");
    }
  };

  const handleDownloadReport = async () => {
    if (!application) return;
    try {
      const blob = await api.documents.downloadReport(application.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "report.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("error", "Ошибка скачивания отчёта");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " Б";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
    return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
  };

  const statusBadge = (available: boolean, reason?: string) => {
    if (available) {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Готово</Badge>;
    }
    if (reason?.includes("not uploaded")) {
      return <Badge variant="secondary">Не загружен отчёт</Badge>;
    }
    if (reason?.includes("not approved")) {
      return <Badge variant="outline" className="border-yellow-300 text-yellow-700">Ожидание проверки</Badge>;
    }
    return <Badge variant="secondary">Не готово</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Документы</h2>
          <p className="text-muted-foreground">Документы по практике</p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Документы</h2>
          <p className="text-muted-foreground">Документы по практике</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">У вас пока нет заявок. Подайте заявку для доступа к документам.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold">Документы</h2>
        <p className="text-muted-foreground">Документы по практике</p>
      </div>

      {/* Сгенерированные документы */}
      {templates.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Готовые документы</h3>
          <div className="grid gap-3">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.available
                          ? "Доступно для скачивания"
                          : template.reason || "Не доступно"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(template.available, template.reason)}
                    {template.available && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(template.id, template.slug)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {templates.length === 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Документы</h3>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Шаблоны документов пока не добавлены</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Загрузка отчёта */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Отчёт о практике</h3>
        <Card>
          <CardContent className="space-y-3 p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {reportFile ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                  <div className="flex items-center gap-2">
                    <File className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{reportFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(reportFile.size)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleRemoveFile}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Администратор проверит отчёт и одобрит формирование документов
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-dashed"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Загрузка..." : "Загрузить отчёт (DOCX или PDF)"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
