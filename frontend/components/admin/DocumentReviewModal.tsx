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
import { AdminDocumentData, SaveReviewDto } from "@/shared/api/types";
import { FileText, BookOpen, ClipboardList, FileCheck, Download, CheckCircle2, XCircle, Clock } from "lucide-react";

interface DocumentReviewModalProps {
  document: AdminDocumentData;
  onClose: () => void;
  onSaveReview: (documentId: string, data: SaveReviewDto) => Promise<void>;
  onApproveReport: (documentId: string) => Promise<void>;
  onRejectReport: (documentId: string) => Promise<void>;
}

export function DocumentReviewModal({
  document: doc,
  onClose,
  onSaveReview,
  onApproveReport,
  onRejectReport,
}: DocumentReviewModalProps) {
  const [activeTab, setActiveTab] = useState("iz");
  const [saving, setSaving] = useState(false);

  // Форма отзыва
  const [reviewForm, setReviewForm] = useState<SaveReviewDto>({
    review_activities: doc.review_activities || "",
    review_characteristic: doc.review_characteristic || "",
    review_employed: doc.review_employed || false,
    review_next_practice: doc.review_next_practice || false,
    review_employment_offer: doc.review_employment_offer || false,
    review_suggestions: doc.review_suggestions || "",
    review_grade: doc.review_grade || "",
  });

  const handleSaveReview = async () => {
    setSaving(true);
    try {
      await onSaveReview(doc.id, reviewForm);
    } finally {
      setSaving(false);
    }
  };

  const handleApproveReport = async () => {
    setSaving(true);
    try {
      await onApproveReport(doc.id);
    } finally {
      setSaving(false);
    }
  };

  const handleRejectReport = async () => {
    setSaving(true);
    try {
      await onRejectReport(doc.id);
    } finally {
      setSaving(false);
    }
  };

  const hasReport = !!doc.report_file_url;
  const reportApproved = doc.report_admin_approved;
  const isIZFilled = !!(doc.student_fio && doc.group && doc.direction_code);
  const isReviewFilled = !!(reviewForm.review_activities || reviewForm.review_characteristic);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl top-[5vh] translate-y-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Документы: {doc.user.fio}</DialogTitle>
        </DialogHeader>

        {/* Информация о студенте */}
        <div className="grid grid-cols-2 gap-4 text-sm p-3 bg-muted/30 rounded-lg shrink-0">
          <div>
            <span className="text-muted-foreground">Когорта:</span>{" "}
            {doc.cohort.name}
          </div>
          <div>
            <span className="text-muted-foreground">Группа:</span>{" "}
            {doc.group}
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Тема:</span>{" "}
            {doc.practice_topic}
          </div>
        </div>

        {/* Скроллируемый контент с вкладками */}
        <div className="overflow-y-auto flex-1 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b mb-4">
              <TabsTrigger
                value="iz"
                className="flex items-center gap-2 px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <FileText className="h-4 w-4" />
                ИЗ
                {isIZFilled ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100">
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="report"
                className="flex items-center gap-2 px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <ClipboardList className="h-4 w-4" />
                Отчёт
                {!hasReport ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100">
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  </span>
                ) : reportApproved ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100">
                    <Clock className="h-3.5 w-3.5 text-yellow-600" />
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="review"
                className="flex items-center gap-2 px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <BookOpen className="h-4 w-4" />
                Отзыв
                {isReviewFilled ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100">
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="title"
                className="flex items-center gap-2 px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                <FileCheck className="h-4 w-4" />
                Титул
                {reportApproved ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100">
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Вкладка: ИЗ */}
            <TabsContent value="iz" className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                <h4 className="font-medium text-sm">Индивидуальное задание</h4>
                {doc.student_fio && doc.group && doc.direction_code ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Студент:</span>
                      <span>{doc.student_fio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Группа:</span>
                      <span>{doc.group}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Код направления:</span>
                      <span>{doc.direction_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Направление:</span>
                      <span>{doc.direction_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Программа:</span>
                      <span>{doc.program_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Специальность:</span>
                      <span>{doc.specialty}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground">Тема практики:</span>
                      <p className="mt-1">{doc.practice_topic}</p>
                    </div>
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground">Задачи этапа:</span>
                      <p className="mt-1 whitespace-pre-wrap">{doc.main_stage_tasks}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    ИЗ не заполнено
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Вкладка: Отчёт */}
            <TabsContent value="report" className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/30 space-y-4">
                <h4 className="font-medium text-sm">Отчёт о практике</h4>
                {hasReport ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                      <span>Файл отчёта загружен</span>
                      {reportApproved ? (
                        <Badge className="bg-green-500">Одобрен</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">На проверке</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.report_file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Скачать отчёт
                        </a>
                      </Button>
                      {!reportApproved && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handleApproveReport}
                            disabled={saving}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Одобрить
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleRejectReport}
                            disabled={saving}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Отклонить
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Отчёт не загружен
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Вкладка: Отзыв */}
            <TabsContent value="review" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Мероприятия за время практики</label>
                  <Textarea
                    value={reviewForm.review_activities}
                    onChange={(e) => setReviewForm({ ...reviewForm, review_activities: e.target.value })}
                    placeholder="Опишите мероприятия, которые выполнял студент..."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Характеристика</label>
                  <Textarea
                    value={reviewForm.review_characteristic}
                    onChange={(e) => setReviewForm({ ...reviewForm, review_characteristic: e.target.value })}
                    placeholder="Краткая характеристика уровня подготовки..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-6 pl-1">
                  <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                    <Checkbox
                      checked={reviewForm.review_employed}
                      onCheckedChange={(checked) => setReviewForm({ ...reviewForm, review_employed: checked === true })}
                    />
                    Трудоустроен
                  </label>
                  <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                    <Checkbox
                      checked={reviewForm.review_next_practice}
                      onCheckedChange={(checked) => setReviewForm({ ...reviewForm, review_next_practice: checked === true })}
                    />
                    Следующая практика
                  </label>
                  <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                    <Checkbox
                      checked={reviewForm.review_employment_offer}
                      onCheckedChange={(checked) => setReviewForm({ ...reviewForm, review_employment_offer: checked === true })}
                    />
                    Предложение работы
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium">Предложения и замечания</label>
                  <Textarea
                    value={reviewForm.review_suggestions}
                    onChange={(e) => setReviewForm({ ...reviewForm, review_suggestions: e.target.value })}
                    placeholder="Предложения и замечания от организации..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-3 block">Оценка за практику</label>
                  <RadioGroup
                    value={reviewForm.review_grade}
                    onValueChange={(value) => setReviewForm({ ...reviewForm, review_grade: value })}
                    className="flex items-center gap-6 pl-1"
                  >
                    <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                      <RadioGroupItem value="отлично" />
                      Отлично
                    </label>
                    <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                      <RadioGroupItem value="хорошо" />
                      Хорошо
                    </label>
                    <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                      <RadioGroupItem value="удовлетворительно" />
                      Удовлетворительно
                    </label>
                  </RadioGroup>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveReview} disabled={saving}>
                    {saving ? "Сохранение..." : "Сохранить отзыв"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Вкладка: Титул */}
            <TabsContent value="title" className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/30">
                <h4 className="font-medium text-sm mb-3">Титульный лист</h4>
                {reportApproved ? (
                  <div className="space-y-4">
                    <div className="text-center py-4 text-muted-foreground">
                      <FileCheck className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p>Отчёт одобрен. Титульный лист доступен для скачивания.</p>
                    </div>
                    <div className="flex justify-center">
                      <Button variant="outline" asChild>
                        <a href={`/api/student-document/${doc.id}/title-sheet`} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Скачать титульный лист
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Титульный лист доступен для скачивания после одобрения отчёта
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
