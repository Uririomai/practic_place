"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, X } from "lucide-react";

interface StepTestTaskProps {
  roles: { name: string }[];
  testTasks: Record<string, string>;
  onChange: (testTasks: Record<string, string>) => void;
}

export function StepTestTask({ roles, testTasks, onChange }: StepTestTaskProps) {
  // Состояние: какая роль сейчас раскрыта (редактируется)
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // Временный текст для редактируемого поля (чтобы при отмене не терять)
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({});

  const handleStartEdit = (roleName: string) => {
    setDraftTexts(prev => ({
      ...prev,
      [roleName]: testTasks[roleName] ?? "",
    }));
    setExpandedRole(roleName);
  };

  const handleCancel = () => {
    setExpandedRole(null);
    // Текст сохраняется в draftTexts — при повторном клике "Добавить" восстановится
  };

  const handleSave = (roleName: string) => {
    const text = draftTexts[roleName] ?? "";
    onChange({
      ...testTasks,
      [roleName]: text,
    });
    setExpandedRole(null);
  };

  const handleDraftChange = (roleName: string, value: string) => {
    setDraftTexts(prev => ({ ...prev, [roleName]: value }));
  };

  if (roles.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Сначала добавьте роли на шаге «Роли»
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Добавьте тестовое задание для каждой роли. Задания станет видно студентам после создания когорты.
        Этот шаг можно пропустить и настроить позже.
      </p>

      <div className="space-y-3">
        {roles.map((role) => {
          const hasTest = !!testTasks[role.name]?.trim();
          const isExpanded = expandedRole === role.name;

          return (
            <div key={role.name} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{role.name}</span>
                  {hasTest && !isExpanded && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <Check className="h-3 w-3" />
                      Задание добавлено
                    </span>
                  )}
                </div>

                {!isExpanded && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartEdit(role.name)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {hasTest ? "Редактировать" : "Добавить тестовое задание"}
                  </Button>
                )}
              </div>

              {isExpanded && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Введите текст тестового задания..."
                    value={draftTexts[role.name] ?? ""}
                    onChange={(e) => handleDraftChange(role.name, e.target.value)}
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
                      onClick={() => handleSave(role.name)}
                      disabled={!(draftTexts[role.name] ?? "").trim()}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Сохранить
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
