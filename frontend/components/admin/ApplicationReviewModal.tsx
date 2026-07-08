"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminApplication, CohortRole } from "@/shared/api/types";
import { FileText, BookOpen } from "lucide-react";

interface ApplicationReviewModalProps {
  application: AdminApplication;
  roles: CohortRole[];
  onClose: () => void;
  onApprove: (id: string, roleId: string) => Promise<void>;
  onReject: (id: string, comment: string) => Promise<void>;
}

// Маппинг ID полей на русские названия
const fieldLabels: Record<string, string> = {
  fio: "ФИО",
  group: "Группа",
  course: "Курс",
  desired_role: "Желаемая роль",
  tech_stack: "Используемые технологии",
};

type Tab = "survey" | "test";

export function ApplicationReviewModal({
  application,
  roles,
  onClose,
  onApprove,
  onReject,
}: ApplicationReviewModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("survey");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

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

  const isPending = application.status === "pending";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl top-[5vh] translate-y-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Заявка: {application.user.fio}</DialogTitle>
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
            {application.cohort.name}
          </div>
          <div>
            <span className="text-muted-foreground">Дата подачи:</span>{" "}
            {new Date(application.createdAt).toLocaleDateString("ru-RU")}
          </div>
          <div>
            <span className="text-muted-foreground">Статус:</span>{" "}
            {application.status === "approved" && <Badge className="bg-green-500">Одобрена</Badge>}
            {application.status === "rejected" && <Badge variant="destructive">Отклонена</Badge>}
            {application.status === "pending" && <Badge variant="secondary">Ожидание</Badge>}
          </div>
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
              <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                {Object.entries(application.surveyData || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{fieldLabels[key] || key}:</span>
                    <span>{value || "—"}</span>
                  </div>
                ))}
              </div>

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
                      onClick={handleReject}
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
              {application.testAnswer ? (
                <div className="rounded-lg border p-4 text-sm bg-muted/30 whitespace-pre-wrap">
                  {application.testAnswer}
                </div>
              ) : (
                <div className="rounded-lg border p-8 text-center text-muted-foreground">
                  Ответ не отправлен
                </div>
              )}

              {isPending && application.testAnswer && (
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Комментарий при отклонении</label>
                    <Textarea
                      placeholder="Необязательно..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                    />
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
                      onClick={handleReject}
                      disabled={loading}
                    >
                      Отклонить
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
