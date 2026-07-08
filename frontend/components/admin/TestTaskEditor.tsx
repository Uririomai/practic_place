"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TestTask } from "@/shared/api/types";

interface TestTaskEditorProps {
  testTask: TestTask | null;
  onSave: (question: string) => Promise<void>;
  onCancel: () => void;
}

export function TestTaskEditor({ testTask, onSave, onCancel }: TestTaskEditorProps) {
  const [question, setQuestion] = useState(testTask?.content || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!question.trim()) return;
    setSaving(true);
    try {
      await onSave(question.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {testTask?.publishedAt && (
        <p className="text-sm text-muted-foreground">
          Опубликовано: {new Date(testTask.publishedAt).toLocaleDateString("ru-RU")}
        </p>
      )}

      <Textarea
        placeholder="Введите текст тестового задания..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={8}
      />

      <p className="text-sm text-muted-foreground">
        Задание станет видно студентам после публикации.
      </p>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button onClick={handleSave} disabled={saving || !question.trim()}>
          {saving ? "Сохранение..." : testTask ? "Обновить" : "Опубликовать"}
        </Button>
      </div>
    </div>
  );
}
