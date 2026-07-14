"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TestTask, CohortRole } from "@/shared/api/types";
import { api } from "@/shared/api/client";
import { Plus, Check, X, Trash2, Loader2 } from "lucide-react";

interface TestTaskEditorProps {
  cohortId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function TestTaskEditor({ cohortId, onSaved, onCancel }: TestTaskEditorProps) {
  const [roles, setRoles] = useState<CohortRole[]>([]);
  const [testTasks, setTestTasks] = useState<TestTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [cohortId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, tasksData] = await Promise.all([
        api.admin.getRoles(cohortId),
        api.admin.getTestTask(cohortId),
      ]);
      setRoles(rolesData);
      setTestTasks(tasksData);
    } catch (err) {
      console.error("Failed to load test tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTaskForRole = (roleId: string): TestTask | undefined => {
    return testTasks.find(t => t.roleId === roleId);
  };

  const handleStartEdit = (role: CohortRole) => {
    const existing = getTaskForRole(role.id);
    setDraftTexts(prev => ({
      ...prev,
      [role.id]: existing?.content ?? "",
    }));
    setExpandedRole(role.id);
  };

  const handleCancel = () => {
    setExpandedRole(null);
  };

  const handleSave = async (role: CohortRole) => {
    const content = draftTexts[role.id] ?? "";
    if (!content.trim()) return;

    setSaving(true);
    try {
      const existing = getTaskForRole(role.id);
      if (existing) {
        // Обновляем существующее задание
        await api.admin.updateTestTask(cohortId, existing.id, {
          content: content.trim(),
          publishedAt: new Date().toISOString(),
        });
      } else {
        // Создаём новое задание
        await api.admin.saveTestTask(cohortId, {
          roleId: role.id,
          content: content.trim(),
          publishedAt: new Date().toISOString(),
        });
      }
      await loadData();
      setExpandedRole(null);
    } catch (err) {
      console.error("Failed to save test task:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (task: TestTask) => {
    if (!confirm("Удалить тестовое задание для этой роли?")) return;
    setSaving(true);
    try {
      await api.admin.deleteTestTask(cohortId, task.id);
      await loadData();
    } catch (err) {
      console.error("Failed to delete test task:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDraftChange = (roleId: string, value: string) => {
    setDraftTexts(prev => ({ ...prev, [roleId]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        У когорты нет ролей. Добавьте роли через кнопку «Роли».
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        На каждую роль можно добавить отдельное тестовое задание. Задание станет видно студентам после публикации.
      </p>

      <div className="space-y-3">
        {roles.map((role) => {
          const task = getTaskForRole(role.id);
          const isExpanded = expandedRole === role.id;
          const hasTask = !!task?.content?.trim();

          return (
            <div key={role.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{role.name}</span>
                  {hasTask && !isExpanded && (
                    <Badge variant="outline" className="border-green-300 text-green-700">
                      <Check className="h-3 w-3 mr-1" />
                      Задание добавлено
                    </Badge>
                  )}
                  {task?.publishedAt && !isExpanded && (
                    <span className="text-xs text-muted-foreground">
                      Опубликовано: {new Date(task.publishedAt).toLocaleDateString("ru-RU")}
                    </span>
                  )}
                </div>

                {!isExpanded && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEdit(role)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {hasTask ? "Редактировать" : "Добавить тестовое задание"}
                    </Button>
                    {hasTask && task && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(task)}
                        disabled={saving}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Введите текст тестового задания..."
                    value={draftTexts[role.id] ?? ""}
                    onChange={(e) => handleDraftChange(role.id, e.target.value)}
                    rows={6}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Отменить
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSave(role)}
                      disabled={saving || !(draftTexts[role.id] ?? "").trim()}
                    >
                      {saving ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3 mr-1" />
                      )}
                      {saving ? "Сохранение..." : task ? "Обновить" : "Опубликовать"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Закрыть
        </Button>
      </div>
    </div>
  );
}
