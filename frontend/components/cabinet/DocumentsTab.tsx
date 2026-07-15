"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Upload,
  X,
  File,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  ClipboardList,
  FileCheck,
} from "lucide-react";
import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/hooks/use-auth";
import { DocumentTemplateAvailability, Application, UserProfile } from "@/shared/api/types";

// Поля профиля, обязательные для ИЗ
const PROFILE_FIELDS: Array<keyof UserProfile> = [
  "student_fio", "group", "direction_code", "direction_name",
  "program_name", "specialty", "practice_topic", "main_stage_tasks",
];

function isProfileComplete(profile?: UserProfile): boolean {
  if (!profile) return false;
  return PROFILE_FIELDS.every((f) => profile[f]?.trim());
}

// Поля отзыва, заполняемые администратором (7 полей)
const REVIEW_FIELDS = [
  "review_activities", "review_characteristic", "review_suggestions", "review_grade",
  "review_employed", "review_next_practice", "review_employment_offer",
];

function isReviewFilled(data?: Record<string, unknown> | null): boolean {
  if (!data) return false;
  return REVIEW_FIELDS.every((f) => {
    const val = data[f];
    // Текстовые поля — не пустые строки; булевы — строки "да"/"нет"
    return val !== undefined && val !== null && val !== "";
  });
}

export function DocumentsTab() {
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplateAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Состояние отчёта
  const [reportStatus, setReportStatus] = useState<"NONE" | "PENDING" | "APPROVED" | "REJECTED">("NONE");
  const [reportFileName, setReportFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  // Данные отзыва (заполняет админ)
  const [reviewData, setReviewData] = useState<Record<string, unknown> | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Разбиваем документы по slug
  const docsBySlug = useMemo(() => {
    const map: Record<string, DocumentTemplateAvailability> = {};
    templates.forEach((t) => { map[t.slug] = t; });
    return map;
  }, [templates]);

  const additionalDocs = useMemo(
    () => templates.filter((t) => !["iz", "review", "title"].includes(t.slug)),
    [templates]
  );

  // Загрузка данных
  useEffect(() => {
    if (!user?.id) return;
    api.applications
      .getMy()
      .then((apps) => {
        const found =
          apps.find((a) => a.cohortId === user.activeCohortId) ||
          apps.find((a) => a.status?.toLowerCase() === "approved") ||
          apps[0];
        if (found) {
          setApplication(found);
          return Promise.all([
            api.documents.list(found.id).catch(() => []),
            api.admin.getApplication(found.id).catch(() => null),
          ]);
        }
        return null;
      })
      .then((results) => {
        if (!results) return;
        const [docs, appDetails] = results;
        if (docs) setTemplates(docs);
        if (appDetails) {
          const report = (appDetails as any).files?.find((f: any) => f.type === "REPORT");
          if (report) {
            setReportStatus(report.status as "PENDING" | "APPROVED" | "REJECTED");
            setReportFileName(report.storageUri?.split("/").pop() || "report");
          }
          // Отзыв из docData.data полного ответа заявки
          const dd = (appDetails as any)?.docData?.data;
          if (dd) setReviewData(dd);
        }
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [user?.id, user?.activeCohortId]);

  // Загрузка отчёта
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
      setReportStatus("PENDING");
      setReportFileName(file.name);
      showToast("success", "Отчёт загружен. Ожидайте проверки администратором.");
    } catch {
      showToast("error", "Ошибка загрузки отчёта");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Скачивание документа из шаблона
  const handleDownload = async (templateId: string, name: string) => {
    if (!application) return;
    try {
      const blob = await api.documents.download(application.id, templateId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      showToast("error", "Ошибка скачивания документа");
    }
  };

  // Скачивание отчёта
  const handleDownloadReport = async () => {
    if (!application) return;
    try {
      const blob = await api.documents.downloadReport(application.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      showToast("error", "Ошибка скачивания отчёта");
    }
  };

  const canUploadReport = reportStatus === "NONE" || reportStatus === "REJECTED";

  // === Состояния загрузки ===

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

  if (!user?.activeCohortId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Документы</h2>
          <p className="text-muted-foreground">Документы по практике</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Вы не зачислены ни на одну практику.</p>
          </CardContent>
        </Card>
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

  // === Рендер ===

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold">Документы</h2>
        <p className="text-muted-foreground">Документы по практике</p>
      </div>

      {/* 1. Индивидуальное задание (ИЗ) */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Индивидуальное задание</p>
              <p className="text-xs text-muted-foreground">
                {!docsBySlug.iz
                  ? "Шаблон не загружен администратором"
                  : docsBySlug.iz.available && isProfileComplete(user?.profile)
                    ? "Документ сгенерирован и доступен для скачивания"
                    : !isProfileComplete(user?.profile)
                      ? "Заполните все поля профиля для генерации документа"
                      : "Заполните данные для генерации документа"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!docsBySlug.iz ? (
              <Badge variant="secondary">Нет шаблона</Badge>
            ) : docsBySlug.iz.available && isProfileComplete(user?.profile) ? (
              <>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Готово</Badge>
                <Button size="sm" variant="ghost" onClick={() => docsBySlug.iz && handleDownload(docsBySlug.iz.id, "iz")}>
                  <Download className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Link href="/cabinet?tab=profile">
                <Button size="sm" variant="outline">Заполнить</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Отзыв */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <BookOpen className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium">Отзыв о практике</p>
              <p className="text-xs text-muted-foreground">
                {!docsBySlug.review
                  ? "Шаблон не загружен администратором"
                  : docsBySlug.review.available && isReviewFilled(reviewData)
                    ? "Отзыв заполнен и доступен для скачивания"
                    : "Заполняется администратором"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!docsBySlug.review ? (
              <Badge variant="secondary">Нет шаблона</Badge>
            ) : docsBySlug.review.available && isReviewFilled(reviewData) ? (
              <>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Готово</Badge>
                <Button size="sm" variant="ghost" onClick={() => docsBySlug.review && handleDownload(docsBySlug.review.id, "review")}>
                  <Download className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Badge variant="secondary">Ожидание заполнения</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Титульный лист */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <FileCheck className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium">Титульный лист</p>
              <p className="text-xs text-muted-foreground">
                {reportStatus === "APPROVED"
                  ? docsBySlug.title?.available
                    ? "Отчёт одобрен — титульный лист доступен"
                    : "Отчёт одобрен — ожидается загрузка шаблона администратором"
                  : reportStatus === "PENDING"
                    ? "Отчёт на проверке — титульный лист будет доступен после одобрения"
                    : reportStatus === "REJECTED"
                      ? "Отчёт отклонён — загрузите отчёт заново"
                      : "Загрузите отчёт для генерации титульного листа"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!docsBySlug.title ? (
              <Badge variant="secondary">Нет шаблона</Badge>
            ) : docsBySlug.title.available && reportStatus === "APPROVED" ? (
              <>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Готово</Badge>
                <Button size="sm" variant="ghost" onClick={() => docsBySlug.title && handleDownload(docsBySlug.title.id, "title")}>
                  <Download className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Badge variant="secondary">Не готово</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Отчёт о практике */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <ClipboardList className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Отчёт о практике</p>
              <p className="text-xs text-muted-foreground">
                Загрузите отчёт в формате DOCX
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Статус отчёта */}
          {reportStatus !== "NONE" && (
            <div className="flex items-center gap-2 text-sm">
              {reportStatus === "PENDING" && (
                <>
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-700">На проверке</span>
                </>
              )}
              {reportStatus === "APPROVED" && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">Одобрен</span>
                </>
              )}
              {reportStatus === "REJECTED" && (
                <>
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700">Отклонён — загрузите заново</span>
                </>
              )}
            </div>
          )}

          {/* Файл + скачивание (только после одобрения) */}
          {reportStatus === "APPROVED" && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <File className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium">{reportFileName || "report.docx"}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                <Download className="h-4 w-4 mr-1" />
                Скачать
              </Button>
            </div>
          )}

          {/* Кнопка загрузки */}
          {canUploadReport && (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-dashed"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Загрузка..." : reportStatus === "REJECTED" ? "Загрузить отчёт заново" : "Загрузить отчёт"}
            </Button>
          )}

          {reportStatus === "PENDING" && (
            <p className="text-xs text-center text-muted-foreground">
              Администратор проверит отчёт и одобрит формирование документов
            </p>
          )}
        </CardContent>
      </Card>

      {/* 5. Дополнительные документы */}
      {additionalDocs.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Дополнительные документы</h3>
          <div className="grid gap-3">
            {additionalDocs.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.available ? "Доступно для скачивания" : doc.reason || "Не доступно"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.available ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Готово</Badge>
                    ) : (
                      <Badge variant="secondary">Не готово</Badge>
                    )}
                    {doc.available && (
                      <Button size="sm" variant="ghost" onClick={() => handleDownload(doc.id, doc.slug)}>
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
    </div>
  );
}
