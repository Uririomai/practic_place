"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminDocumentData } from "@/shared/api/types";
import { api } from "@/shared/api/client";
import { CheckCircle2, XCircle, Download, FileText, ClipboardList, FileCheck } from "lucide-react";

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
        <div key={doc.applicationId} className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">{doc.cohort?.name || "Когорта"}</h3>
            <ReportStatusBadge status={doc.report?.status} />
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
            </TabsList>

            <TabsContent value="iz">
              <IZContent doc={doc} />
            </TabsContent>
            <TabsContent value="report">
              <ReportContent doc={doc} />
            </TabsContent>
          </Tabs>
        </div>
      ))}
    </div>
  );
}

function IZContent({ doc }: { doc: AdminDocumentData }) {
  const iz = doc.iz;
  if (!iz?.student_fio) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        ИЗ не заполнено
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <InfoRow label="Студент" value={iz.student_fio} />
      <InfoRow label="Группа" value={iz.group} />
      <InfoRow label="Код направления" value={iz.direction_code} />
      <InfoRow label="Направление" value={iz.direction_name} />
      <InfoRow label="Программа" value={iz.program_name} />
      <InfoRow label="Специальность" value={iz.specialty} />
      <InfoRow label="Тема практики" value={iz.practice_topic} />
      <InfoRow label="Задачи этапа" value={iz.main_stage_tasks} />
    </div>
  );
}

function ReportContent({ doc }: { doc: AdminDocumentData }) {
  const report = doc.report;

  if (!report) {
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
        {report.status === "APPROVED" ? (
          <Badge className="bg-green-500">Одобрен</Badge>
        ) : report.status === "REJECTED" ? (
          <Badge variant="destructive">Отклонён</Badge>
        ) : (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">На проверке</Badge>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            const blob = await api.documents.downloadReport(doc.applicationId);
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
          } catch (err) {
            console.error("Ошибка скачивания:", err);
          }
        }}
      >
        <Download className="h-4 w-4 mr-2" />
        Скачать отчёт
      </Button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}

function ReportStatusBadge({ status }: { status?: string }) {
  if (!status) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100">
        <XCircle className="h-5 w-5 text-red-500" />
      </span>
    );
  }
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100">
      <FileCheck className="h-5 w-5 text-yellow-600" />
    </span>
  );
}
