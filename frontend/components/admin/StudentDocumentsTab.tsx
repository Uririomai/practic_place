"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AdminDocumentData } from "@/shared/api/types";
import { CheckCircle2, XCircle, Clock, Download, FileText, ClipboardList, BookOpen, FileCheck } from "lucide-react";

interface StudentDocumentsTabProps {
  documents: AdminDocumentData[];
}

export function StudentDocumentsTab({ documents }: StudentDocumentsTabProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Документов не найдено
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {documents.map((doc) => (
        <div key={doc.id} className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">{doc.cohort?.name || "Когорта"}</h3>
            <ReportStatusBadge
              hasReport={!!doc.report_file_url}
              isApproved={doc.report_admin_approved}
            />
          </div>

          <Tabs defaultValue="iz">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b mb-4">
              <TabsTrigger
                value="iz"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <FileText className="h-4 w-4 mr-1" />
                ИЗ
              </TabsTrigger>
              <TabsTrigger
                value="report"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <ClipboardList className="h-4 w-4 mr-1" />
                Отчёт
              </TabsTrigger>
              <TabsTrigger
                value="review"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <BookOpen className="h-4 w-4 mr-1" />
                Отзыв
              </TabsTrigger>
              <TabsTrigger
                value="title"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <FileCheck className="h-4 w-4 mr-1" />
                Титул
              </TabsTrigger>
            </TabsList>

            <TabsContent value="iz">
              <IZContent doc={doc} />
            </TabsContent>
            <TabsContent value="report">
              <ReportContent doc={doc} />
            </TabsContent>
            <TabsContent value="review">
              <ReviewContent doc={doc} />
            </TabsContent>
            <TabsContent value="title">
              <TitleContent doc={doc} />
            </TabsContent>
          </Tabs>
        </div>
      ))}
    </div>
  );
}

function IZContent({ doc }: { doc: AdminDocumentData }) {
  if (!doc.student_fio && !doc.group) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        ИЗ не заполнено
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <InfoRow label="Студент" value={doc.student_fio} />
      <InfoRow label="Группа" value={doc.group} />
      <InfoRow label="Код направления" value={doc.direction_code} />
      <InfoRow label="Направление" value={doc.direction_name} />
      <InfoRow label="Программа" value={doc.program_name} />
      <InfoRow label="Специальность" value={doc.specialty} />
      <InfoRow label="Тема практики" value={doc.practice_topic} />
      <InfoRow label="Задачи этапа" value={doc.main_stage_tasks} />
    </div>
  );
}

function ReportContent({ doc }: { doc: AdminDocumentData }) {
  if (!doc.report_file_url) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Отчёт не загружен
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <FileCheck className="h-4 w-4 text-muted-foreground" />
        <span>Файл отчёта загружен</span>
        {doc.report_admin_approved ? (
          <Badge className="bg-green-500">Одобрен</Badge>
        ) : (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">На проверке</Badge>
        )}
      </div>
      <a
        href={doc.report_file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <Download className="h-4 w-4" />
        Скачать отчёт
      </a>
    </div>
  );
}

function ReviewContent({ doc }: { doc: AdminDocumentData }) {
  const hasReview = doc.review_activities || doc.review_characteristic;

  if (!hasReview) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        Отзыв не заполнен
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {doc.review_activities && (
        <div>
          <label className="text-muted-foreground">Мероприятия:</label>
          <p className="mt-1 whitespace-pre-wrap">{doc.review_activities}</p>
        </div>
      )}
      {doc.review_characteristic && (
        <div>
          <label className="text-muted-foreground">Характеристика:</label>
          <p className="mt-1 whitespace-pre-wrap">{doc.review_characteristic}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        {doc.review_employed && <Badge>Трудоустроен</Badge>}
        {doc.review_next_practice && <Badge>Следующая практика</Badge>}
        {doc.review_employment_offer && <Badge>Предложение работы</Badge>}
      </div>
      {doc.review_suggestions && (
        <div>
          <label className="text-muted-foreground">Предложения:</label>
          <p className="mt-1 whitespace-pre-wrap">{doc.review_suggestions}</p>
        </div>
      )}
      {doc.review_grade && (
        <div>
          <label className="text-muted-foreground">Оценка:</label>
          <p className="mt-1 font-medium">{doc.review_grade}</p>
        </div>
      )}
    </div>
  );
}

function TitleContent({ doc }: { doc: AdminDocumentData }) {
  if (!doc.report_admin_approved) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Титульный лист доступен после одобрения отчёта
      </div>
    );
  }

  return (
    <div className="text-center py-6">
      <FileCheck className="h-8 w-8 mx-auto mb-2 text-green-600" />
      <p className="text-sm text-muted-foreground mb-4">Отчёт одобрен. Титульный лист доступен.</p>
      <a
        href={`/api/student-document/${doc.id}/title-sheet`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <Download className="h-4 w-4" />
        Скачать титульный лист
      </a>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}

function ReportStatusBadge({ hasReport, isApproved }: { hasReport: boolean; isApproved: boolean }) {
  if (!hasReport) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100">
        <XCircle className="h-5 w-5 text-red-500" />
      </span>
    );
  }
  if (isApproved) {
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
}
