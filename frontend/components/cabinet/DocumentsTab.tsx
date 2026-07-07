"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { api } from "@/shared/api/client";
import { StudentDocumentData } from "@/shared/api/types";

type DocStatus = "ready" | "pending" | "not_ready";

interface DocumentCard {
  id: string;
  title: string;
  description: string;
  status: DocStatus;
  statusLabel: string;
}

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

  const documents: DocumentCard[] = [
    {
      id: "iz",
      title: "Индивидуальное задание",
      description: "Формируется на основе заполненных вами полей",
      status: doc?.practice_topic ? "ready" : "not_ready",
      statusLabel: doc?.practice_topic ? "Готово к скачиванию" : "Заполните данные",
    },
    {
      id: "review",
      title: "Отзыв о практике",
      description: "Заполняется администратором после завершения практики",
      status: doc?.review_characteristic ? "ready" : "pending",
      statusLabel: doc?.review_characteristic ? "Готово" : "Ожидает заполнения",
    },
    {
      id: "title",
      title: "Титульный лист",
      description: "Требуется загрузка отчёта и одобрение администратором",
      status: doc?.report_admin_approved ? "ready" : "not_ready",
      statusLabel: doc?.report_admin_approved ? "Готово" : "Ожидает отчёт",
    },
  ];

  const statusIcon = (status: DocStatus) => {
    switch (status) {
      case "ready":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "not_ready":
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверяем формат
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/pdf", // .pdf
    ];
    const allowedExtensions = [".docx", ".pdf"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      showToast("error", "Допустимые форматы: DOCX, PDF");
      return;
    }

    // Проверяем размер (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast("error", "Файл слишком большой (максимум 10 МБ)");
      return;
    }

    setUploading(true);

    // Имитация загрузки
    setTimeout(() => {
      setReportFile({ name: file.name, size: file.size });
      setUploading(false);
      showToast("success", "Отчёт успешно загружен");
    }, 800);
  };

  const handleRemoveFile = () => {
    setReportFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " Б";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
    return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Документы</h2>
          <p className="text-muted-foreground">Документы по практике</p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
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

      {/* Генерируемые документы */}
      <div className="grid gap-4">
        {documents.map((d) => (
          <Card key={d.id}>
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                {statusIcon(d.status)}
                <div>
                  <p className="font-medium">{d.title}</p>
                  <p className="text-sm text-muted-foreground">{d.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(d.status)}
                {d.status === "ready" && (
                  <Button size="sm" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Скачать
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Загрузка отчёта */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Отчёт о практике
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Загрузите отчёт в формате DOCX или PDF. Файл появится в панели администратора для проверки.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {reportFile ? (
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <File className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{reportFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatSize(reportFile.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  Загружен
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-dashed"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Загрузка..." : "Выберите файл (DOCX или PDF)"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
