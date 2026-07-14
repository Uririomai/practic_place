"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SurveyField } from "@/shared/api/types";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

export type SurveyFieldData = Omit<SurveyField, "id">;

interface StepSurveyProps {
  fields: SurveyFieldData[];
  roles: { name: string }[];
  onChange: (fields: SurveyFieldData[]) => void;
}

const DEFAULT_FIELDS: SurveyFieldData[] = [
  {
    label: "ФИО",
    type: "text",
    placeholder: "Иванов Иван Иванович",
    required: true,
    order: 1,
    options: [],
  },
  {
    label: "Группа",
    type: "text",
    placeholder: "РИ-330930",
    required: true,
    order: 2,
    options: [],
  },
  {
    label: "Курс",
    type: "select",
    required: true,
    order: 3,
    options: ["1", "2", "3", "4"],
    placeholder: "",
  },
  {
    label: "Желаемая роль",
    type: "select",
    required: true,
    order: 4,
    options: [], // заполняется из roles
    placeholder: "",
  },
  {
    label: "Используемые технологии",
    type: "textarea",
    placeholder: "React, Node.js, TypeScript...",
    required: true,
    order: 5,
    options: [],
  },
];

const ROLE_FIELD_LABEL = "Желаемая роль";

/** Получить дефолтные поля с учётом ролей */
function getDefaultFields(roles: { name: string }[]): SurveyFieldData[] {
  return DEFAULT_FIELDS.map((f) => {
    if (f.label === ROLE_FIELD_LABEL) {
      return { ...f, options: roles.map((r) => r.name) };
    }
    return f;
  });
}

export function getInitialSurveyFields(
  existingFields: SurveyFieldData[] | null,
  roles: { name: string }[]
): SurveyFieldData[] {
  if (existingFields && existingFields.length > 0) {
    // Обновить опции у "Желаемая роль" из текущих ролей
    return existingFields.map((f) => {
      if (f.label === ROLE_FIELD_LABEL) {
        return { ...f, options: roles.map((r) => r.name), type: "select" as const };
      }
      return f;
    });
  }
  return getDefaultFields(roles);
}

const TYPE_LABELS: Record<SurveyField["type"], string> = {
  text: "Текст",
  textarea: "Длинный текст",
  select: "Выбор из списка",
};

export function StepSurvey({ fields, roles, onChange }: StepSurveyProps) {
  const addField = () => {
    onChange([
      ...fields,
      {
        label: "",
        type: "text",
        order: fields.length + 1,
        required: false,
        options: [],
        placeholder: "",
      },
    ]);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<SurveyFieldData>) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const newFields = [...fields];
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    // Обновить order
    onChange(newFields.map((f, i) => ({ ...f, order: i + 1 })));
  };

  const isRoleField = (field: SurveyFieldData) => field.label === ROLE_FIELD_LABEL;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Поля анкеты для студентов. Поле «{ROLE_FIELD_LABEL}» заполняется автоматически из ролей.
        </p>
        <Button size="sm" variant="outline" onClick={addField}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить поле
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Поля не добавлены.
        </p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const locked = isRoleField(field);
            return (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border p-4 bg-card"
              >
                <div className="flex flex-col gap-1 mt-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={index === 0}
                    onClick={() => moveField(index, "up")}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={index === fields.length - 1}
                    onClick={() => moveField(index, "down")}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Название поля"
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      disabled={locked}
                    />
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(index, { type: e.target.value as SurveyField["type"] })
                      }
                      disabled={locked}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                    >
                      <option value="text">Текст</option>
                      <option value="textarea">Длинный текст</option>
                      <option value="select">Выбор из списка</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Placeholder"
                      value={field.placeholder || ""}
                      onChange={(e) => updateField(index, { placeholder: e.target.value })}
                      disabled={locked}
                    />
                    <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                      <Checkbox
                        checked={field.required || false}
                        onCheckedChange={(checked) =>
                          updateField(index, { required: checked === true })
                        }
                        disabled={locked}
                      />
                      Обязательное
                    </label>
                  </div>

                  {field.type === "select" && (
                    <Input
                      placeholder={
                        locked
                          ? "Заполняется из ролей (шаг 2)"
                          : "Варианты через запятую: Вариант 1, Вариант 2"
                      }
                      value={field.options?.join(", ") || ""}
                      onChange={(e) =>
                        updateField(index, {
                          options: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      disabled={locked}
                    />
                  )}

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{TYPE_LABELS[field.type]}</Badge>
                    {field.required && <Badge>Обязательное</Badge>}
                    {locked && <Badge variant="outline">Из ролей</Badge>}
                  </div>
                </div>

                {!locked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
