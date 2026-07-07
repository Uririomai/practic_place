"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import { api } from "@/shared/api/client";
import { TaskCard, CreateTaskCardDto } from "@/shared/api/types";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  eachDayOfInterval,
  isWeekend,
  parseISO,
  isSameDay,
} from "date-fns";
import { ru } from "date-fns/locale";

export function TasksTab() {
  const [cards, setCards] = useState<TaskCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<TaskCard | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [form, setForm] = useState({ title: "", description: "", artifact_link: "" });
  const [saving, setSaving] = useState(false);

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd }).filter(
    (d) => !isWeekend(d)
  );
  const weekLabel = `${format(currentWeekStart, "d MMM", { locale: ru })} — ${format(weekEnd, "d MMM yyyy", { locale: ru })}`;

  const loadCards = () => {
    setLoading(true);
    const weekStr = format(currentWeekStart, "yyyy-MM-dd");
    api.taskCards
      .list("test-cohort-id", weekStr)
      .then(setCards)
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCards();
  }, [currentWeekStart]);

  const getCardForDay = (date: Date): TaskCard | undefined => {
    return cards.find((c) => isSameDay(parseISO(c.date), date));
  };

  const openModal = (date: Date, existing?: TaskCard) => {
    setSelectedDate(format(date, "yyyy-MM-dd"));
    if (existing) {
      setEditingCard(existing);
      setForm({
        title: existing.title,
        description: existing.description,
        artifact_link: existing.artifact_link,
      });
    } else {
      setEditingCard(null);
      setForm({ title: "", description: "", artifact_link: "" });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingCard) {
        const updated = await api.taskCards.update(editingCard.id, form);
        setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const data: CreateTaskCardDto = {
          cohortId: "test-cohort-id",
          date: selectedDate,
          ...form,
        };
        const created = await api.taskCards.create(data);
        setCards((prev) => [...prev, created]);
      }
      setModalOpen(false);
    } catch {
      // ошибка сохранения
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Задачи</h2>
        <p className="text-muted-foreground">Ежедневный отчёт о выполненной работе</p>
      </div>

      {/* Навигация по неделям */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentWeekStart((w) => subWeeks(w, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          {weekLabel}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentWeekStart((w) => addWeeks(w, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Сетка дней */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {weekDays.map((day) => {
            const card = getCardForDay(day);
            const dayLabel = format(day, "EEEE, d MMMM", { locale: ru });
            return (
              <Card
                key={day.toISOString()}
                className="cursor-pointer transition-colors hover:border-primary/50"
                onClick={() => openModal(day, card)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">{dayLabel}</p>
                      {card ? (
                        <div className="mt-2 space-y-1">
                          <p className="font-medium">{card.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {card.description}
                          </p>
                          {card.artifact_link && (
                            <a
                              href={card.artifact_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Артефакт
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Нет записи — нажмите, чтобы добавить
                        </p>
                      )}
                    </div>
                    {!card && (
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Модальное окно */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCard ? "Редактировать задачу" : "Новая задача"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Название</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Что было сделано"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Описание</label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Подробное описание задачи"
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Ссылка на артефакт
              </label>
              <Input
                value={form.artifact_link}
                onChange={(e) =>
                  setForm((f) => ({ ...f, artifact_link: e.target.value }))
                }
                placeholder="https://github.com/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
