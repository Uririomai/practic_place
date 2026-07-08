"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ExternalLink,
  Clock,
  Plus,
} from "lucide-react";
import { api } from "@/shared/api/client";
import { TaskCard, CreateTaskCardDto, CohortParticipant } from "@/shared/api/types";
import { mockCohort } from "@/src/mocks/fixtures";
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
  isWithinInterval,
} from "date-fns";
import { ru } from "date-fns/locale";

const COHORT_ID = "test-cohort-id";

/** Дата и время обновления: «1 июля, 14:30» */
function formatUpdatedAt(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, "d MMMM, HH:mm", { locale: ru });
}

/** Цвет бейджа роли */
function roleBadgeColor(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("frontend") || r.includes("фронтенд"))
    return "bg-blue-100 text-blue-700 hover:bg-blue-100";
  if (r.includes("backend") || r.includes("бэкенд"))
    return "bg-green-100 text-green-700 hover:bg-green-100";
  if (r.includes("дизайнер") || r.includes("design"))
    return "bg-purple-100 text-purple-700 hover:bg-purple-100";
  if (r.includes("аналитик") || r.includes("analyst"))
    return "bg-orange-100 text-orange-700 hover:bg-orange-100";
  return "bg-gray-100 text-gray-700 hover:bg-gray-100";
}

export function TasksTab() {
  const [cards, setCards] = useState<TaskCard[]>([]);
  const [participants, setParticipants] = useState<CohortParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false); // По умолчанию только свои

  const practiceStart = parseISO(mockCohort.practiceStart);
  const practiceEnd = parseISO(mockCohort.practiceEnd);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const week = startOfWeek(today, { weekStartsOn: 1 });
    if (week < practiceStart) return startOfWeek(practiceStart, { weekStartsOn: 1 });
    if (week > practiceEnd) return startOfWeek(practiceStart, { weekStartsOn: 1 });
    return week;
  });

  // Модальное окно редактирования (свои задачи)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<TaskCard | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [form, setForm] = useState({ title: "", description: "", artifact_link: "" });
  const [saving, setSaving] = useState(false);

  // Модальное окно просмотра (чужие задачи)
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingCard, setViewingCard] = useState<TaskCard | null>(null);
  const [viewingParticipant, setViewingParticipant] = useState<CohortParticipant | null>(null);

  // Календарь
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Прогресс
  const totalWeeks = useMemo(() => {
    const start = startOfWeek(practiceStart, { weekStartsOn: 1 });
    const end = endOfWeek(practiceEnd, { weekStartsOn: 1 });
    return Math.round((end.getTime() - start.getTime()) / (7 * 86400000)) + 1;
  }, []);

  const currentWeekNumber = useMemo(() => {
    const practiceWeekStart = startOfWeek(practiceStart, { weekStartsOn: 1 });
    return Math.round((currentWeekStart.getTime() - practiceWeekStart.getTime()) / (7 * 86400000)) + 1;
  }, [currentWeekStart]);

  // Дни недели (пн-пт)
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd }).filter(
    (d) => !isWeekend(d)
  );

  const isWeekInPractice =
    isWithinInterval(currentWeekStart, { start: practiceStart, end: practiceEnd }) ||
    isWithinInterval(weekEnd, { start: practiceStart, end: practiceEnd });

  const weekLabel = `${format(currentWeekStart, "d MMM", { locale: ru })} — ${format(weekEnd, "d MMM yyyy", { locale: ru })}`;

  // Загрузка
  const loadCards = () => {
    setLoading(true);
    const weekStr = format(currentWeekStart, "yyyy-MM-dd");
    api.taskCards
      .list(COHORT_ID, weekStr)
      .then(setCards)
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  };

  const loadParticipants = () => {
    api.cohortParticipants
      .list(COHORT_ID)
      .then(setParticipants)
      .catch(() => setParticipants([]));
  };

  useEffect(() => { loadCards(); }, [currentWeekStart]);
  useEffect(() => { loadParticipants(); }, []);

  // Текущий пользователь
  const currentUserId = "user-1";

  // Участники, отсортированные по ролям
  const sortedParticipants = useMemo(() => {
    if (showAll) {
      return [...participants].sort((a, b) => a.role.localeCompare(b.role));
    }
    return participants.filter((p) => p.userId === currentUserId);
  }, [participants, showAll]);

  // Группировка по ролям (для заголовков групп)
  const roleGroups = useMemo(() => {
    const groups = new Map<string, CohortParticipant[]>();
    sortedParticipants.forEach((p) => {
      const list = groups.get(p.role) || [];
      list.push(p);
      groups.set(p.role, list);
    });
    return groups;
  }, [sortedParticipants]);

  // Получить карточку для дня и пользователя
  const getCardForDay = (date: Date, userId: string): TaskCard | undefined => {
    return cards.find((c) => c.userId === userId && isSameDay(parseISO(c.date), date));
  };

  // Открыть модалку создания/редактирования (свои задачи)
  const openEditModal = (date: Date, userId: string, existing?: TaskCard) => {
    setSelectedDate(format(date, "yyyy-MM-dd"));
    setSelectedUserId(userId);
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

  // Открыть модалку просмотра (чужие задачи)
  const openViewModal = (card: TaskCard, participant: CohortParticipant) => {
    setViewingCard(card);
    setViewingParticipant(participant);
    setViewModalOpen(true);
  };

  // Optimistic save
  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);

    const optimisticCard: TaskCard = editingCard
      ? { ...editingCard, ...form, updated_at: new Date().toISOString() }
      : {
          id: "temp-" + Date.now(),
          userId: selectedUserId,
          cohortId: COHORT_ID,
          date: selectedDate,
          ...form,
          artifact_link: form.artifact_link || "",
          updated_at: new Date().toISOString(),
        };

    setCards((prev) => {
      if (editingCard) return prev.map((c) => (c.id === editingCard.id ? optimisticCard : c));
      return [...prev, optimisticCard];
    });
    setModalOpen(false);

    try {
      if (editingCard) {
        const updated = await api.taskCards.update(editingCard.id, form);
        setCards((prev) => prev.map((c) => (c.id === optimisticCard.id ? updated : c)));
      } else {
        const data: CreateTaskCardDto = { cohortId: COHORT_ID, date: selectedDate, ...form };
        const created = await api.taskCards.create(data);
        setCards((prev) => prev.map((c) => (c.id === optimisticCard.id ? created : c)));
      }
    } catch {
      setCards((prev) => prev.filter((c) => c.id !== optimisticCard.id));
      setModalOpen(true);
    } finally {
      setSaving(false);
    }
  };

  // Навигация
  const goToPrevWeek = () => {
    setCurrentWeekStart((w) => {
      const prev = subWeeks(w, 1);
      const min = startOfWeek(practiceStart, { weekStartsOn: 1 });
      return prev < min ? min : prev;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((w) => {
      const next = addWeeks(w, 1);
      const max = startOfWeek(practiceEnd, { weekStartsOn: 1 });
      return next > max ? max : next;
    });
  };

  const canGoPrev = currentWeekStart > startOfWeek(practiceStart, { weekStartsOn: 1 });
  const canGoNext = currentWeekStart < startOfWeek(practiceEnd, { weekStartsOn: 1 });

  // Выбор даты в календаре — переходим к неделе, содержащей эту дату
  const handleCalendarSelect = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    // Ограничиваем пределами практики
    const minWeek = startOfWeek(practiceStart, { weekStartsOn: 1 });
    const maxWeek = startOfWeek(practiceEnd, { weekStartsOn: 1 });
    const clamped = weekStart < minWeek ? minWeek : weekStart > maxWeek ? maxWeek : weekStart;
    setCurrentWeekStart(clamped);
    setCalendarOpen(false);
  };

  // Контент модалки
  const modalContent = (
    <>
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
          <label className="mb-1.5 block text-sm font-medium">Что было сделано</label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Подробное описание выполненной работы"
            rows={4}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Ссылка на артефакт</label>
          <Input
            value={form.artifact_link}
            onChange={(e) => setForm((f) => ({ ...f, artifact_link: e.target.value }))}
            placeholder="https://github.com/..."
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setModalOpen(false)}>Отмена</Button>
        <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
          {saving ? "Сохранение..." : "Сохранить"}
        </Button>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Задачи</h2>
          <p className="text-muted-foreground">Ежедневный отчёт о выполненной работе</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground">
            Неделя {currentWeekNumber} из {totalWeeks}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(practiceStart, "d MMM", { locale: ru })} — {format(practiceEnd, "d MMM yyyy", { locale: ru })}
          </p>
        </div>
      </div>

      {/* Навигация + фильтр */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevWeek} disabled={!canGoPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {weekLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background border shadow-lg" align="center">
              <Calendar
                selected={currentWeekStart}
                onSelect={handleCalendarSelect}
                disabledBefore={practiceStart}
                disabledAfter={practiceEnd}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={goToNextWeek} disabled={!canGoNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
          <Checkbox
            checked={showAll}
            onCheckedChange={(checked) => setShowAll(checked === true)}
          />
          Показать всех
        </label>
      </div>

      {/* Таблица */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : !isWeekInPractice ? (
        <div className="rounded-lg border bg-muted/50 p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Эта неделя вне периода практики</p>
          <p className="text-xs text-muted-foreground">
            Практика: {format(practiceStart, "d MMMM", { locale: ru })} — {format(practiceEnd, "d MMMM yyyy", { locale: ru })}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            {/* Шапка: даты */}
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="sticky left-0 z-10 w-[220px] min-w-[180px] bg-muted/50 p-3 text-left font-medium text-muted-foreground">
                  Участник
                </th>
                {weekDays.map((day) => (
                  <th key={day.toISOString()} className="min-w-[160px] p-3 text-left font-medium text-muted-foreground">
                    <div className="flex flex-col">
                      <span className="text-xs uppercase">
                        {format(day, "EEEE", { locale: ru })}
                      </span>
                      <span>
                        {format(day, "d MMMM", { locale: ru })}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {Array.from(roleGroups.entries()).map(([role, groupParticipants]) => (
                <Fragment key={role}>
                  {/* Заголовок группы ролей */}
                  {showAll && roleGroups.size > 1 && (
                    <tr className="border-b bg-muted/30">
                      <td colSpan={weekDays.length + 1} className="px-3 py-2">
                        <Badge variant="secondary" className={roleBadgeColor(role)}>
                          {role}
                        </Badge>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {groupParticipants.length} чел.
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* Строки участников */}
                  {groupParticipants.map((participant) => (
                    <tr key={participant.userId} className="border-b last:border-b-0 hover:bg-muted/20">
                      {/* ФИО + роль */}
                      <td className="sticky left-0 z-10 bg-background p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {participant.fio.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{participant.fio}</p>
                            {!showAll && (
                              <Badge variant="secondary" className={`mt-0.5 text-[10px] ${roleBadgeColor(participant.role)}`}>
                                {participant.role}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Ячейки дней */}
                      {weekDays.map((day) => {
                        const card = getCardForDay(day, participant.userId);
                        const isOwn = participant.userId === currentUserId;
                        const canClick = isOwn || card; // Свои + чужие с карточкой

                        const handleClick = () => {
                          if (!canClick) return;
                          if (isOwn) {
                            openEditModal(day, participant.userId, card);
                          } else if (card) {
                            openViewModal(card, participant);
                          }
                        };

                        return (
                          <td key={day.toISOString()} className="p-1.5">
                            <button
                              onClick={handleClick}
                              disabled={!canClick}
                              className={`w-full min-h-[60px] rounded-md p-2 text-left transition-colors ${
                                card
                                  ? isOwn
                                    ? "bg-primary/5 hover:bg-primary/10 border border-primary/20 cursor-pointer"
                                    : "bg-muted/50 border border-muted hover:bg-muted/70 cursor-pointer"
                                  : isOwn
                                    ? "hover:bg-muted border border-transparent hover:border-dashed hover:border-muted-foreground/30 cursor-pointer"
                                    : "border border-transparent cursor-default"
                              }`}
                            >
                              {card ? (
                                <div className="space-y-1">
                                  <p className="line-clamp-1 text-xs font-medium">{card.title}</p>
                                  {card.description && (
                                    <p className="line-clamp-2 text-[11px] text-muted-foreground">
                                      {card.description}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between">
                                    {card.artifact_link && (
                                      <ExternalLink className="h-3 w-3 text-primary" />
                                    )}
                                    <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                      <Clock className="h-2.5 w-2.5" />
                                      {formatUpdatedAt(card.updated_at)}
                                    </span>
                                  </div>
                                </div>
                              ) : isOwn ? (
                                <div className="flex h-full items-center justify-center">
                                  <Plus className="h-4 w-4 text-muted-foreground/40" />
                                </div>
                              ) : null}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Модалка редактирования (свои задачи) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCard ? "Редактировать задачу" : "Новая задача"}
            </DialogTitle>
          </DialogHeader>
          {modalContent}
        </DialogContent>
      </Dialog>

      {/* Модалка просмотра (чужие задачи) */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Просмотр задачи</DialogTitle>
            {viewingParticipant && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                  {viewingParticipant.fio.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <span className="text-sm text-muted-foreground">{viewingParticipant.fio}</span>
                <Badge variant="secondary" className={`text-[10px] ${roleBadgeColor(viewingParticipant.role)}`}>
                  {viewingParticipant.role}
                </Badge>
              </div>
            )}
          </DialogHeader>
          {viewingCard && (
            <div className="space-y-4 py-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Название</label>
                <p className="text-sm font-medium">{viewingCard.title}</p>
              </div>
              {viewingCard.description && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Что было сделано</label>
                  <p className="text-sm whitespace-pre-wrap">{viewingCard.description}</p>
                </div>
              )}
              {viewingCard.artifact_link && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Артефакт</label>
                  <a
                    href={viewingCard.artifact_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {viewingCard.artifact_link}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
                <Clock className="h-3.5 w-3.5" />
                Обновлено: {formatUpdatedAt(viewingCard.updated_at)}
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>Закрыть</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

