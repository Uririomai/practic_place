"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminDocumentData, SaveReviewDto } from "@/shared/api/types";

interface ReviewFormProps {
  document: AdminDocumentData;
  onClose: () => void;
  onSave: (documentId: string, data: SaveReviewDto) => Promise<void>;
}

export function ReviewForm({ document: doc, onClose, onSave }: ReviewFormProps) {
  const [form, setForm] = useState<SaveReviewDto>({
    review_activities: doc.review_activities || "",
    review_characteristic: doc.review_characteristic || "",
    review_employed: doc.review_employed || false,
    review_next_practice: doc.review_next_practice || false,
    review_employment_offer: doc.review_employment_offer || false,
    review_suggestions: doc.review_suggestions || "",
    review_grade: doc.review_grade || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(doc.id, form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Отзыв: {doc.student_fio}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Информация о студенте */}
          <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-muted/30 rounded-lg">
            <div>
              <span className="text-muted-foreground">Группа:</span> {doc.group}
            </div>
            <div>
              <span className="text-muted-foreground">Направление:</span> {doc.direction_name}
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Тема:</span> {doc.practice_topic}
            </div>
          </div>

          {/* Поля отзыва */}
          <div>
            <label className="text-sm font-medium">Мероприятия за время практики</label>
            <Textarea
              value={form.review_activities}
              onChange={(e) => setForm({ ...form, review_activities: e.target.value })}
              placeholder="Опишите мероприятия, которые выполнял студент..."
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Характеристика</label>
            <Textarea
              value={form.review_characteristic}
              onChange={(e) => setForm({ ...form, review_characteristic: e.target.value })}
              placeholder="Краткая характеристика уровня подготовки..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-6 pl-1">
            <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
              <Checkbox
                checked={form.review_employed}
                onCheckedChange={(checked) => setForm({ ...form, review_employed: checked === true })}
              />
              Трудоустроен
            </label>
            <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
              <Checkbox
                checked={form.review_next_practice}
                onCheckedChange={(checked) => setForm({ ...form, review_next_practice: checked === true })}
              />
              Следующая практика
            </label>
            <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
              <Checkbox
                checked={form.review_employment_offer}
                onCheckedChange={(checked) => setForm({ ...form, review_employment_offer: checked === true })}
              />
              Предложение работы
            </label>
          </div>

          <div>
            <label className="text-sm font-medium">Предложения и замечания</label>
            <Textarea
              value={form.review_suggestions}
              onChange={(e) => setForm({ ...form, review_suggestions: e.target.value })}
              placeholder="Предложения и замечания от организации..."
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">Оценка за практику</label>
            <RadioGroup
              value={form.review_grade}
              onValueChange={(value) => setForm({ ...form, review_grade: value })}
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

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить отзыв"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
