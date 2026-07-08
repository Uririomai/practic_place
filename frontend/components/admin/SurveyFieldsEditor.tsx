"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SurveyField } from "@/shared/api/types";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface SurveyFieldsEditorProps {
  initialFields: SurveyField[];
  onSave: (fields: Omit<SurveyField, 'id'>[]) => Promise<void>;
  onCancel: () => void;
}

export function SurveyFieldsEditor({ initialFields, onSave, onCancel }: SurveyFieldsEditorProps) {
  const [fields, setFields] = useState<Omit<SurveyField, 'id'>[]>(
    initialFields.map(({ id, ...rest }) => rest)
  );
  const [saving, setSaving] = useState(false);

  const addField = () => {
    setFields([
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
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<Omit<SurveyField, 'id'>>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const orderedFields = fields.map((f, i) => ({ ...f, order: i + 1 }));
      await onSave(orderedFields);
    } finally {
      setSaving(false);
    }
  };

  const typeLabels: Record<SurveyField['type'], string> = {
    text: "Текст",
    textarea: "Длинный текст",
    select: "Выбор из списка",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Поля анкеты</h3>
        <Button size="sm" onClick={addField}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить поле
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Поля не добавлены. Нажмите «Добавить поле» чтобы начать.
        </p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-lg border p-4 bg-card"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground mt-2 shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Название поля"
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(index, { type: e.target.value as SurveyField['type'] })}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  />
                  <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                    <Checkbox
                      checked={field.required || false}
                      onCheckedChange={(checked) => updateField(index, { required: checked === true })}
                    />
                    Обязательное
                  </label>
                </div>

                {field.type === "select" && (
                  <Input
                    placeholder="Варианты через запятую: Вариант 1, Вариант 2"
                    value={field.options?.join(", ") || ""}
                    onChange={(e) =>
                      updateField(index, {
                        options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                )}

                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{typeLabels[field.type]}</Badge>
                  {field.required && <Badge>Обязательное</Badge>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeField(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}
