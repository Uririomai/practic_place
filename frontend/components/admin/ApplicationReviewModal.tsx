"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminApplication, CohortRole, TestTask } from "@/shared/api/types";
import { api } from "@/shared/api/client";
import { FileText, BookOpen, Loader2 } from "lucide-react";

interface ApplicationReviewModalProps {
  application: AdminApplication;
  roles: CohortRole[];
  onClose: () => void;
  onApprove: (id: string, roleId: string) => Promise<void>;
  onReject: (id: string, comment: string) => Promise<void>;
  onTestReviewed?: () => void;
}

type Tab = "survey" | "test";

interface ApplicationDetail {
  answers?: { fieldId: string; value: string; field: { id: string; label: string; type: string } }[];
}

export function ApplicationReviewModal({
  application,
  roles,
  onClose,
  onApprove,
  onReject,
  onTestReviewed,
}: ApplicationReviewModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("survey");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<"application" | "test">("application");
  const [details, setDetails] = useState<ApplicationDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [testTask, setTestTask] = useState<TestTask | null>(null);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const data = await api.admin.getApplication(application.id);
        setDetails(data);
      } catch (e) {
        console.error("Ошибка загрузки деталей заявки:", e);
      } finally {
        setDetailsLoading(false);
      }
    };
    loadDetails();

    // Загружаем тестовое задание для роли студента
    const loadTestTask = async () => {
      try {
        const tasks = await api.testTask.get(application.cohortId);
        const matched = application.roleId
          ? tasks.find((t) => t.roleId === application.roleId)
          : tasks[0];
        setTestTask(matched || null);
      } catch {
        setTestTask(null);
      }
    };
    loadTestTask();
  }, [application.id, application.cohortId, application.roleId]);

  const handleApprove = async () => {
    if (!selectedRoleId) return;
    setLoading(true);
    try {
      await onApprove(application.id, selectedRoleId);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(application.id, comment);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Проверка: можно проверить тест если тест отправлен и статус не финальный (APPROVED/REJECTED)
  const s = application.status?.toLowerCase();
  const canReviewTest =
    !!application.testAnswer && s !== "approved" && s !== "rejected";

  const handleApproveTest = async () => {
    setLoading(true);
    try {
      await api.admin.reviewTestTask(application.id, { status: "APPROVED" });
      // Назначаем активную когорту студенту
      await api.users.setActiveCohort(application.cohortId);
      onTestReviewed?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTest = async () => {
    setLoading(true);
    try {
      await api.admin.reviewTestTask(application.id, {
        status: "REJECTED",
        reviewComment: comment,
      });
      onTestReviewed?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const isPending = application.status?.toUpperCase() === "PENDING";
  const answers = details?.answers || [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl top-[5vh] translate-y-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Заявка: {application.user.fio || application.user.email}</DialogTitle>
        </DialogHeader>

        {/* Скроллируемый контент */}
        <div className="overflow-y-auto flex-1 min-h-0 space-y-4">
        {/* Информация о кандидате */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Email:</span>{" "}
            {application.user.email}
          </div>
          <div>
            <span className="text-muted-foreground">Когорта:</span>{" "}
            {application.cohort?.name || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Дата подачи:</span>{" "}
            {new Date(application.createdAt).toLocaleDateString("ru-RU")}
          </div>
          <div>
            <span className="text-muted-foreground">Статус:</span>{" "}
            {application.status?.toLowerCase() === "approved" && <Badge className="bg-green-500">Одобрена</Badge>}
            {application.status?.toLowerCase() === "rejected" && <Badge variant="destructive">Отклонена</Badge>}
            {(!application.status || (application.status?.toLowerCase() !== "approved" && application.status?.toLowerCase() !== "rejected")) && <Badge variant="secondary">Ожидание</Badge>}
          </div>
          {(application.role || application.roleId) && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Роль:</span>{" "}
              <Badge variant="secondary">{application.role?.name || application.roleId}</Badge>
            </div>
          )}
        </div>

        {/* Комментарий при отклонении */}
        {application.reviewComment && (
          <div className="rounded-lg border p-4 text-sm bg-red-50 text-red-700">
            <span className="font-medium">Комментарий:</span> {application.reviewComment}
          </div>
        )}

        {/* Вкладки */}
        <div className="border-b">
          <div className="flex gap-0">
            <button
              onClick={() => setActiveTab("survey")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "survey"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
              Анкета
            </button>
            <button
              onClick={() => setActiveTab("test")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "test"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Тестовое задание
              {application.testAnswer && (
                <Badge variant="secondary" className="ml-1">
                  ✓
                </Badge>
              )}
            </button>
          </div>
        </div>

        {/* Содержимое вкладок */}
        <div className="space-y-4">
          {/* Вкладка: Анкета */}
          {activeTab === "survey" && (
            <>
              {detailsLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загрузка данных анкеты...
                </div>
              ) : answers.length > 0 ? (
                <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                  {answers.map((answer) => (
                    <div key={answer.fieldId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{answer.field.label}:</span>
                      <span className="text-right max-w-[60%]">{answer.value || "—"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border p-8 text-center text-muted-foreground">
                  Ответы анкеты не заполнены
                </div>
              )}

              {isPending && (
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Назначить роль</label>
                    <select
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Выберите роль...</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleApprove}
                      disabled={loading || !selectedRoleId}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Одобрить
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => { setRejectTarget("application"); setRejectDialogOpen(true); }}
                      disabled={loading}
                    >
                      Отклонить
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Вкладка: Тестовое задание */}
          {activeTab === "test" && (
            <>
              {/* Задание */}
              {testTask && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Тестовое задание:</p>
                  <div className="rounded-lg border p-4 text-sm bg-primary/5 whitespace-pre-wrap">
                    {testTask.content}
                  </div>
                </div>
              )}

              {/* Ответ студента */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Ответ студента:</p>
                {application.testAnswer ? (
                  <div className="rounded-lg border p-4 text-sm bg-muted/30 whitespace-pre-wrap">
                    {application.testAnswer}
                  </div>
                ) : (
                  <div className="rounded-lg border p-8 text-center text-muted-foreground">
                    Ответ не отправлен
                  </div>
                )}
              </div>

              {/* Статус проверки теста */}
              {application.status?.toLowerCase() === "approved" && (
                <Badge className="bg-green-500">Тест одобрен</Badge>
              )}
              {application.status?.toLowerCase() === "rejected" && (
                <Badge variant="destructive">Тест отклонён</Badge>
              )}

              {canReviewTest && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex gap-2">
                    <Button
                      onClick={handleApproveTest}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Одобрить тест
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => { setRejectTarget("test"); setRejectDialogOpen(true); }}
                      disabled={loading}
                    >
                      Отклонить тест
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </DialogContent>

      {/* Диалог подтверждения отклонения */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Отклонить заявку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Укажите причину отклонения заявки {application.user.fio || application.user.email}
            </p>
            <Textarea
              placeholder="Укажите причину отклонения..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={rejectTarget === "test" ? handleRejectTest : handleReject}
                disabled={loading || !comment.trim()}
              >
                {loading ? "Отклонение..." : "Отклонить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
