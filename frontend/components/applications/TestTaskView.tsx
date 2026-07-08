"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TestTask, TestTaskStatus } from "@/shared/api/types";
import { api } from "@/shared/api/client";

interface TestTaskViewProps {
  cohortId: string;
  testTask: TestTask | null;
  initialStatus: TestTaskStatus;
  initialAnswer?: string;
}

const statusConfig: Record<TestTaskStatus, { label: string; variant: string }> = {
  not_submitted: { label: "Не отправлен", variant: "secondary" },
  pending: { label: "На проверке", variant: "outline" },
  approved: { label: "Одобрен", variant: "default" },
  rejected: { label: "Не прошёл", variant: "destructive" },
};

export function TestTaskView({
  cohortId,
  testTask,
  initialStatus,
  initialAnswer,
}: TestTaskViewProps) {
  const router = useRouter();
  const [status, setStatus] = useState<TestTaskStatus>(initialStatus);
  const [answer, setAnswer] = useState(initialAnswer || "");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    try {
      await api.testTask.submit({ cohortId, answer });
      setStatus("pending");
      showToast("success", "Задание успешно отправлено на проверку!");
      // Редирект в лк через 1.5с
      setTimeout(() => {
        router.push("/cabinet");
      }, 1500);
    } catch {
      showToast("error", "Ошибка при отправке. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    setSubmitting(true);
    try {
      await api.testTask.submit({ cohortId, answer });
      setStatus("pending");
      showToast("success", "Задание успешно отправлено на проверку!");
      setTimeout(() => {
        router.push("/cabinet");
      }, 1500);
    } catch {
      showToast("error", "Ошибка при отправке. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!testTask) {
    return (
      <div className="rounded-lg border bg-muted/50 p-8 text-center">
        <p className="text-lg font-medium">Тестовое задание ещё не опубликовано</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Администратор подготовит задание позже
        </p>
      </div>
    );
  }

  const isReadOnly = status === "approved" || status === "pending";

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Задание</h2>
        <Badge variant={statusConfig[status].variant as "secondary" | "outline" | "default" | "destructive"}>
          {statusConfig[status].label}
        </Badge>
      </div>

      <div className="rounded-lg border p-4">
        <p className="whitespace-pre-wrap">{testTask.question}</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Ваш ответ
          <span className="text-muted-foreground">*</span>
        </label>
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Введите ваш ответ..."
          rows={5}
          disabled={isReadOnly}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {answer.length} символов
        </span>
        {status === "rejected" ? (
          <Button onClick={handleResubmit} disabled={submitting || !answer.trim()}>
            {submitting ? "Отправка..." : "Отправить заново"}
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isReadOnly || submitting || !answer.trim()}
          >
            {status === "not_submitted" ? "Отправить на проверку" : "Отправлено"}
          </Button>
        )}
      </div>
    </div>
  );
}
