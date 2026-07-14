"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdminDocumentData } from "@/shared/api/types";
import { api } from "@/shared/api/client";
import {
  ChevronLeft, ChevronRight, Search, CheckCircle2, XCircle, Clock,
  Download, FileText, BookOpen, ClipboardList, FileCheck,
} from "lucide-react";

interface DocumentsTableProps {
  documents: AdminDocumentData[];
  onRefresh: () => void;
}

const ITEMS_PER_PAGE = 25;

export function DocumentsTable({ documents, onRefresh }: DocumentsTableProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<AdminDocumentData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogDoc, setRejectDialogDoc] = useState<AdminDocumentData | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const filtered = documents.filter((doc) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        doc.user.email.toLowerCase().includes(q) ||
        doc.user.fio?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

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
      setSelectedDoc(null);
    } catch (err) {
      console.error("Ошибка одобрения:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (applicationId: string, comment?: string) => {
    setActionLoading(true);
    try {
      await api.admin.rejectReport(applicationId, comment);
      onRefresh();
      setSelectedDoc(null);
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
      window.open(url, "_blank");
    } catch (err) {
      console.error("Ошибка скачивания:", err);
    }
  };

  const handleDownloadDoc = async (applicationId: string, templateId: string, name: string) => {
    try {
      const blob = await api.documents.download(applicationId, templateId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
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
            placeholder="Поиск по email или ФИО..."
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
              <th className="px-4 py-3 text-left font-medium">Студент</th>
              <th className="px-4 py-3 text-left font-medium">Когорта</th>
              <th className="px-4 py-3 text-center font-medium">ИЗ</th>
              <th className="px-4 py-3 text-center font-medium">Отзыв</th>
              <th className="px-4 py-3 text-center font-medium">Титул</th>
              <th className="px-4 py-3 text-center font-medium">Отчёт</th>
              <th className="px-4 py-3 text-center font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Студентов не найдено
                </td>
              </tr>
            ) : (
              paginated.map((doc) => {
                const reportStatus = doc.report?.status;
                const izDoc = doc.documents?.find((d) => d.slug === "iz");
                const reviewDoc = doc.documents?.find((d) => d.slug === "review");
                const titleDoc = doc.documents?.find((d) => d.slug === "title");
                return (
                  <tr
                    key={doc.applicationId}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{doc.user.fio || doc.user.email}</p>
                        <p className="text-xs text-muted-foreground">{doc.user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{doc.cohort?.name || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {izDoc?.available ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {reviewDoc?.available ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-500 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {titleDoc?.available ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {reportStatusIcon(reportStatus)}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {reportStatus === "PENDING" && (
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 h-7"
                            onClick={() => handleApprove(doc.applicationId)}
                            disabled={actionLoading}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ок
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7"
                            onClick={() => { setRejectDialogDoc(doc); setRejectComment(""); }}
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
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Диалог отклонения отчёта */}
      <Dialog open={!!rejectDialogDoc} onOpenChange={() => setRejectDialogDoc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Отклонить отчёт</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Укажите причину отклонения отчёта студента {rejectDialogDoc?.user.fio || rejectDialogDoc?.user.email}
            </p>
            <Textarea
              placeholder="Укажите причину отклонения..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRejectDialogDoc(null); setRejectComment(""); }}>
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (rejectDialogDoc) handleReject(rejectDialogDoc.applicationId, rejectComment || undefined);
                  setRejectDialogDoc(null);
                  setRejectComment("");
                }}
                disabled={actionLoading}
              >
                Отклонить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модалка просмотра */}
      {selectedDoc && (
        <DocumentModal
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onRefresh={onRefresh}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          onApprove={handleApprove}
          onReject={handleReject}
          onDownloadReport={handleDownloadReport}
          onDownloadDoc={handleDownloadDoc}
        />
      )}
    </div>
  );
}

// === Модалка документа ===

interface DocumentModalProps {
  doc: AdminDocumentData;
  onClose: () => void;
  onRefresh: () => void;
  actionLoading: boolean;
  setActionLoading: (v: boolean) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, comment?: string) => void;
  onDownloadReport: (id: string) => void;
  onDownloadDoc: (appId: string, templateId: string, name: string) => void;
}

function DocumentModal({
  doc, onClose, onRefresh, actionLoading, setActionLoading,
  onApprove, onReject, onDownloadReport, onDownloadDoc,
}: DocumentModalProps) {
  const izDoc = doc.documents?.find((d) => d.slug === "iz");
  const reviewDoc = doc.documents?.find((d) => d.slug === "review");
  const titleDoc = doc.documents?.find((d) => d.slug === "title");
  const additionalDocs = doc.documents?.filter((d) => !["iz", "review", "title"].includes(d.slug)) || [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Документы: {doc.user.fio || doc.user.email}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="iz" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b shrink-0">
            <TabsTrigger value="iz" className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary">
              <FileText className="h-4 w-4" /> ИЗ
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary">
              <BookOpen className="h-4 w-4" /> Отзыв
            </TabsTrigger>
            <TabsTrigger value="report" className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary">
              <ClipboardList className="h-4 w-4" /> Отчёт
            </TabsTrigger>
            <TabsTrigger value="title" className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary">
              <FileCheck className="h-4 w-4" /> Титул
            </TabsTrigger>
            {additionalDocs.length > 0 && (
              <TabsTrigger value="additional" className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary">
                <FileText className="h-4 w-4" /> Доп.
              </TabsTrigger>
            )}
          </TabsList>

          <div className="overflow-y-auto flex-1 min-h-0 p-4">
            {/* ИЗ */}
            <TabsContent value="iz">
              <IZTab doc={doc} />
            </TabsContent>

            {/* Отзыв */}
            <TabsContent value="review">
              <ReviewTab doc={doc} onRefresh={onRefresh} onClose={onClose} />
            </TabsContent>

            {/* Отчёт */}
            <TabsContent value="report">
              <ReportTab
                doc={doc}
                actionLoading={actionLoading}
                setActionLoading={setActionLoading}
                onApprove={onApprove}
                onReject={onReject}
                onDownloadReport={onDownloadReport}
              />
            </TabsContent>

            {/* Титул */}
            <TabsContent value="title">
              <TitleTab doc={doc} titleDoc={titleDoc} onDownloadDoc={onDownloadDoc} />
            </TabsContent>

            {/* Доп. документы */}
            {additionalDocs.length > 0 && (
              <TabsContent value="additional">
                <AdditionalDocsTab docs={additionalDocs} applicationId={doc.applicationId} onDownloadDoc={onDownloadDoc} />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// === Вкладка: ИЗ ===

function IZTab({ doc }: { doc: AdminDocumentData }) {
  const iz = doc.iz;
  if (!iz?.student_fio) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        ИЗ не заполнено
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <h4 className="font-medium">Индивидуальное задание</h4>
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

// === Вкладка: Отзыв ===

function ReviewTab({ doc, onRefresh, onClose }: { doc: AdminDocumentData; onRefresh: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    review_activities: doc.review?.review_activities || "",
    review_characteristic: doc.review?.review_characteristic || "",
    review_employed: doc.review?.review_employed || false,
    review_next_practice: doc.review?.review_next_practice || false,
    review_employment_offer: doc.review?.review_employment_offer || false,
    review_suggestions: doc.review?.review_suggestions || "",
    review_grade: doc.review?.review_grade || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.studentDocument.save(doc.applicationId, {
        review_activities: form.review_activities,
        review_characteristic: form.review_characteristic,
        review_employed: form.review_employed ? "да" : "нет",
        review_next_practice: form.review_next_practice ? "да" : "нет",
        review_employment_offer: form.review_employment_offer ? "да" : "нет",
        review_suggestions: form.review_suggestions,
        review_grade: form.review_grade,
      });
      setSaved(true);
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Ошибка сохранения отзыва:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {saved && (
        <div className="rounded-lg bg-green-500 text-white px-4 py-3 text-sm font-medium">
          Отзыв сохранён
        </div>
      )}
      <div>
        <h4 className="font-medium text-base">Отзыв о практике</h4>
        <p className="text-sm text-muted-foreground mt-1">
          {doc.user.fio || doc.user.email} — заполните данные для документа
        </p>
      </div>

      {/* 1. Мероприятия */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Мероприятия за время практики</label>
        <p className="text-xs text-muted-foreground">Задачи и обязанности, которые выполнял студент</p>
        <Textarea
          value={form.review_activities}
          onChange={(e) => setForm({ ...form, review_activities: e.target.value })}
          placeholder="Разработка функционала, код-ревью, написание тестов, подготовка документации..."
          rows={4}
        />
      </div>

      {/* 2. Характеристика */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Характеристика</label>
        <p className="text-xs text-muted-foreground">Уровень подготовки и отношение к работе</p>
        <Textarea
          value={form.review_characteristic}
          onChange={(e) => setForm({ ...form, review_characteristic: e.target.value })}
          placeholder="Справляетесь с задачами, проявляет инициативу, осваивает новые технологии..."
          rows={4}
        />
      </div>

      {/* 3. Трудоустройство */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Трудоустройство</label>
        <p className="text-xs text-muted-foreground">Был ли студент трудоустроен в организации</p>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <Checkbox
            checked={form.review_employed}
            onCheckedChange={(c) => setForm({ ...form, review_employed: c === true })}
          />
          Да, трудоустроен
        </label>
      </div>

      {/* 4. Следующая практика */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Следующая практика</label>
        <p className="text-xs text-muted-foreground">Предложено ли пройти следующую практику в организации</p>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <Checkbox
            checked={form.review_next_practice}
            onCheckedChange={(c) => setForm({ ...form, review_next_practice: c === true })}
          />
          Да, предложено
        </label>
      </div>

      {/* 5. Предложение о трудоустройстве */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Предложение о трудоустройстве</label>
        <p className="text-xs text-muted-foreground">Трудоустройство после завершения обучения</p>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <Checkbox
            checked={form.review_employment_offer}
            onCheckedChange={(c) => setForm({ ...form, review_employment_offer: c === true })}
          />
          Да, предложено
        </label>
      </div>

      {/* 6. Предложения и замечания */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Предложения и замечания</label>
        <p className="text-xs text-muted-foreground">Общие впечатления и рекомендации от организации</p>
        <Textarea
          value={form.review_suggestions}
          onChange={(e) => setForm({ ...form, review_suggestions: e.target.value })}
          placeholder="Рекомендуем к сотрудничеству, стоит уделить внимание документированию кода..."
          rows={4}
        />
      </div>

      {/* 7. Оценка */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Оценка за практику</label>
        <p className="text-xs text-muted-foreground">Итоговая оценка по результатам</p>
        <RadioGroup
          value={form.review_grade}
          onValueChange={(v) => setForm({ ...form, review_grade: v })}
          className="flex items-center gap-6"
        >
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <RadioGroupItem value="отлично" /> Отлично
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <RadioGroupItem value="хорошо" /> Хорошо
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <RadioGroupItem value="удовлетворительно" /> Удовлетворительно
          </label>
        </RadioGroup>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить отзыв"}
        </Button>
      </div>
    </div>
  );
}

// === Вкладка: Отчёт ===

function ReportTab({
  doc, actionLoading, setActionLoading, onApprove, onReject, onDownloadReport,
}: {
  doc: AdminDocumentData;
  actionLoading: boolean;
  setActionLoading: (v: boolean) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, comment?: string) => void;
  onDownloadReport: (id: string) => void;
}) {
  const report = doc.report;
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  if (!report) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Отчёт не загружен
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Отчёт о практике</h4>
      <div className="flex items-center gap-2 text-sm">
        <span>Статус:</span>
        <Badge variant={
          report.status === "APPROVED" ? "default" :
          report.status === "REJECTED" ? "destructive" : "secondary"
        }>
          {report.status === "APPROVED" ? "Одобрен" :
           report.status === "REJECTED" ? "Отклонён" : "На проверке"}
        </Badge>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onDownloadReport(doc.applicationId)}>
          <Download className="h-4 w-4 mr-2" />
          Скачать
        </Button>
        {report.status === "PENDING" && (
          <>
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onApprove(doc.applicationId)} disabled={actionLoading}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Одобрить
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setRejectDialogOpen(true)} disabled={actionLoading}>
              <XCircle className="h-4 w-4 mr-2" /> Отклонить
            </Button>
          </>
        )}
      </div>

      {/* Диалог отклонения с комментарием */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Отклонить отчёт</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Укажите причину отклонения отчёта студента {doc.user.fio || doc.user.email}
            </p>
            <Textarea
              placeholder="Укажите причину отклонения..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectComment(""); }}>
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onReject(doc.applicationId, rejectComment || undefined);
                  setRejectDialogOpen(false);
                  setRejectComment("");
                }}
                disabled={actionLoading}
              >
                Отклонить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === Вкладка: Титул ===

function TitleTab({
  doc, titleDoc, onDownloadDoc,
}: {
  doc: AdminDocumentData;
  titleDoc?: { id: string; available: boolean; reason?: string };
  onDownloadDoc: (appId: string, templateId: string, name: string) => void;
}) {
  if (!titleDoc) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Шаблон титульного листа не добавлен
      </div>
    );
  }

  if (!titleDoc.available) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Титульный лист ещё не доступен</p>
        <p className="text-xs mt-1">{titleDoc.reason || "Отчёт должен быть одобрен"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Титульный лист</h4>
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span>Отчёт одобрен. Титульный лист доступен.</span>
      </div>
      <Button variant="outline" onClick={() => onDownloadDoc(doc.applicationId, titleDoc.id, "title")}>
        <Download className="h-4 w-4 mr-2" />
        Скачать титульный лист
      </Button>
    </div>
  );
}

// === Вкладка: Доп. документы ===

function AdditionalDocsTab({
  docs, applicationId, onDownloadDoc,
}: {
  docs: { id: string; name: string; slug: string; available: boolean; reason?: string }[];
  applicationId: string;
  onDownloadDoc: (appId: string, templateId: string, name: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium">Дополнительные документы</h4>
      {docs.map((d) => (
        <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">{d.name}</p>
            <p className="text-xs text-muted-foreground">
              {d.available ? "Доступно для скачивания" : d.reason || "Не доступно"}
            </p>
          </div>
          {d.available ? (
            <Button variant="outline" size="sm" onClick={() => onDownloadDoc(applicationId, d.id, d.slug)}>
              <Download className="h-4 w-4 mr-1" /> Скачать
            </Button>
          ) : (
            <Badge variant="secondary">Не готово</Badge>
          )}
        </div>
      ))}
    </div>
  );
}

// === Утилиты ===

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}
