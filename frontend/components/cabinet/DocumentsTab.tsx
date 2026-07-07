"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  X,
  File,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { api } from "@/shared/api/client";
import { StudentDocumentData } from "@/shared/api/types";

type DocStatus = "ready" | "pending" | "not_ready";

export function DocumentsTab() {
  const [doc, setDoc] = useState<StudentDocumentData | null>(null);
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
    api.studentDocument
      .get("test-cohort-id")
      .then(setDoc)
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, []);

  // Статусы для каждого документа
  const izStatus: DocStatus = doc?.practice_topic ? "ready" : "not_ready";
  const reviewStatus: DocStatus = doc?.review_characteristic ? "ready" : "pending";
  const titleStatus: DocStatus = doc?.report_admin_approved
    ? "ready"
    : reportFile
    ? "pending"
    : "not_ready";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    setTimeout(() => {
      setReportFile({ name: file.name, size: file.size });
      setUploading(false);
      showToast("success", "Отчёт загружен. Ожидайте проверки администратором.");
    }, 800);
  };

  const handleRemoveFile = () => {
    setReportFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " Б";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
    return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
  };

  const statusBadge = (status: DocStatus) => {
    switch (status) {
      case "ready":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Готово</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-yellow-300 text-yellow-700">Ожидание</Badge>;
      case "not_ready":
        return <Badge variant="secondary">Не готово</Badge>;
    }
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

      {/* Индикатор прогресса */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-center gap-4 p-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Прогресс оформления</p>
            <div className="mt-2 flex gap-2">
              <div className={`h-2 flex-1 rounded-full ${izStatus === "ready" ? "bg-green-500" : "bg-muted"}`} />
              <div className={`h-2 flex-1 rounded-full ${reviewStatus === "ready" ? "bg-green-500" : reviewStatus === "pending" ? "bg-yellow-400" : "bg-muted"}`} />
              <div className={`h-2 flex-1 rounded-full ${titleStatus === "ready" ? "bg-green-500" : titleStatus === "pending" ? "bg-yellow-400" : "bg-muted"}`} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {izStatus === "ready" && reviewStatus === "ready" && titleStatus === "ready"
                ? "Все документы готовы"
                : `ИЗ: ${izStatus === "ready" ? "✓" : "—"} · Отзыв: ${reviewStatus === "ready" ? "✓" : reviewStatus === "pending" ? "ожидание" : "—"} · Титул: ${titleStatus === "ready" ? "✓" : titleStatus === "pending" ? "ожидание" : "—"}`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Сгенерированные документы */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Готовые документы</h3>
        <div className="grid gap-3">
          {/* ИЗ */}
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Индивидуальное задание</p>
                  <p className="text-xs text-muted-foreground">
                    {izStatus === "ready" ? "Сформировано на основе анкеты" : "Заполните анкету для генерации"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(izStatus)}
                {izStatus === "ready" && (
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Отзыв */}
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Отзыв о практике</p>
                  <p className="text-xs text-muted-foreground">
                    {reviewStatus === "ready"
                      ? "Заполнен администратором"
                      : "Ожидает заполнения администратором"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(reviewStatus)}
                {reviewStatus === "ready" && (
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Титульный лист + отчёт */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Титульный лист</h3>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Титульный лист</CardTitle>
                {statusBadge(titleStatus)}
              </div>
            </div>
            <CardDescription>
              {titleStatus === "ready"
                ? "Документ готов к скачиванию"
                : titleStatus === "pending"
                ? "Отчёт загружен. Ожидайте проверки администратором."
                : "Загрузите отчёт, чтобы сформировать титульный лист"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {titleStatus === "ready" ? (
              <Button className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Скачать титульный лист
              </Button>
            ) : reportFile ? (
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
                  Администратор проверит отчёт и одобрит формирование титульного листа
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
