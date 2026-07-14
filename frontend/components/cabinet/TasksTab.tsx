"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
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
import { useAuth } from "@/shared/hooks/use-auth";
import { TaskCard, CreateTaskCardDto, CohortStudent } from "@/shared/api/types";
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
  const { user } = useAuth();
  const [cards, setCards] = useState<TaskCard[]>([]);
  const [students, setStudents] = useState<CohortStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Одобренная заявка и её applicationId
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [approvedApp, setApprovedApp] = useState<any>(null);

  // Когорта: из user.activeCohortId + user.cohorts
  const cohort = useMemo(() => {
    if (!user) return null;
    // Ищем когорту по activeCohortId в массиве cohorts
    const found = user.cohorts?.find((c) => c.id === user.activeCohortId);
    return found || user.cohorts?.[0] || null;
  }, [user]);

  // Даты практики из когорты (мемоизированы, чтобы не пересоздавать Date каждый рендер)
  const practiceStart = useMemo(
    () => cohort?.practiceStart ? parseISO(cohort.practiceStart) : null,
    [cohort?.practiceStart]
  );
  const practiceEnd = useMemo(
    () => cohort?.practiceEnd ? parseISO(cohort.practiceEnd) : null,
    [cohort?.practiceEnd]
  );

  // Вычисляем начальную неделю: первая неделя практики или текущая (если практика идёт)
  const getInitialWeek = (pStart: Date | null, pEnd: Date | null): Date => {
    const today = new Date();
    if (!pStart || !pEnd) return startOfWeek(today, { weekStartsOn: 1 });
    const firstPracticeWeek = startOfWeek(pStart, { weekStartsOn: 1 });
    const lastPracticeWeek = startOfWeek(pEnd, { weekStartsOn: 1 });
    const currentWeek = startOfWeek(today, { weekStartsOn: 1 });
    // Если практика ещё не началась — первая неделя практики
    if (today < pStart) return firstPracticeWeek;
    // Если практика идёт — текущая неделя (ограниченная пределами практики)
    if (currentWeek < firstPracticeWeek) return firstPracticeWeek;
    if (currentWeek > lastPracticeWeek) return lastPracticeWeek;
    return currentWeek;
  };

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getInitialWeek(null, null));

  // Модальное окно редактирования
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<TaskCard | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [form, setForm] = useState({ title: "", description: "", artifactLink: "" });
  const [saving, setSaving] = useState(false);

  // Модальное окно просмотра (чужие задачи — пока заглушка)
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingCard, setViewingCard] = useState<TaskCard | null>(null);

  // Календарь
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Инициализация недели по дате начала практики (когда когорта загрузилась)
  useEffect(() => {
    if (practiceStart && practiceEnd) {
      setCurrentWeekStart(getInitialWeek(practiceStart, practiceEnd));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceStart, practiceEnd]);

  // Загрузка студентов и задач из GET /cohorts/:id/students
  useEffect(() => {
    if (!cohort?.id) return;
    setLoading(true);
    api.cohorts
      .getStudents(cohort.id)
      .then((data) => {
        setStudents(data);
        // Находим заявку текущего пользователя
        const myStudent = data.find((s) => s.user.id === user?.id);
        if (myStudent) {
          setApplicationId(myStudent.application.id);
          setApprovedApp(myStudent.application);
          // Задачи текущего пользователя
          setCards(myStudent.tasks as TaskCard[]);
        }
      })
      .catch(() => {
        setStudents([]);
        setCards([]);
      })
      .finally(() => setLoading(false));
  }, [cohort?.id, user?.id]);

  // Прогресс
  const totalWeeks = useMemo(() => {
    if (!practiceStart || !practiceEnd) return 0;
    const start = startOfWeek(practiceStart, { weekStartsOn: 1 });
    const end = endOfWeek(practiceEnd, { weekStartsOn: 1 });
    return Math.round((end.getTime() - start.getTime()) / (7 * 86400000)) + 1;
  }, [practiceStart, practiceEnd]);

  const currentWeekNumber = useMemo(() => {
    if (!practiceStart) return 0;
    const practiceWeekStart = startOfWeek(practiceStart, { weekStartsOn: 1 });
    return Math.round((currentWeekStart.getTime() - practiceWeekStart.getTime()) / (7 * 86400000)) + 1;
  }, [currentWeekStart, practiceStart]);

  // Дни недели (пн-пт)
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd }).filter(
    (d) => !isWeekend(d)
  );

  const isWeekInPractice =
    practiceStart && practiceEnd &&
    (isWithinInterval(currentWeekStart, { start: practiceStart, end: practiceEnd }) ||
    isWithinInterval(weekEnd, { start: practiceStart, end: practiceEnd }));

  const weekLabel = `${format(currentWeekStart, "d MMM", { locale: ru })} — ${format(weekEnd, "d MMM yyyy", { locale: ru })}`;

  // Текущий пользователь
  const currentUserId = user?.id || "";

  // Роль текущего пользователя: сначала из заявки, потом из auth
  const myRole = useMemo(() => {
    return approvedApp?.role?.name || user?.activeRole?.name || "";
  }, [approvedApp, user]);

  // Маппинг студентов в участников для таблицы
  const participants = useMemo(() => {
    return students.map((s) => ({
      userId: s.user.id,
      email: s.user.email,
      fio: s.user.profile?.student_fio || s.user.email,
      role: s.application.role?.name || "Студент",
      applicationId: s.application.id,
    }));
  }, [students]);

  // Участники: текущий пользователь всегда первый
  const sortedParticipants = useMemo(() => {
    const me = participants.filter((p) => p.userId === currentUserId);
    const others = participants
      .filter((p) => p.userId !== currentUserId)
      .sort((a, b) => a.role.localeCompare(b.role));
    if (showAll) return [...me, ...others];
    return me;
  }, [participants, showAll, currentUserId]);

  // Группировка по ролям
  const roleGroups = useMemo(() => {
    const groups = new Map<string, typeof participants>();
    sortedParticipants.forEach((p) => {
      const list = groups.get(p.role) || [];
      list.push(p);
      groups.set(p.role, list);
    });
    return groups;
  }, [sortedParticipants]);

  // Проверка: дата в пределах практики
  const isDayInPractice = (date: Date): boolean => {
    if (!practiceStart || !practiceEnd) return false;
    return isWithinInterval(date, { start: practiceStart, end: practiceEnd });
  };

  // Получить карточку для дня и пользователя
  const getCardForDay = (date: Date, userId: string): TaskCard | undefined => {
    const key = format(date, "yyyy-MM-dd");
    // Ищем задачу в данных студентов
    const student = students.find((s) => s.user.id === userId);
    if (student) {
      const found = student.tasks.find((t) => {
        const taskDate = t.date?.slice(0, 10);
        return taskDate === key;
      });
      if (found) return found as TaskCard;
    }
    // Фоллбэк: свои задачи из отдельного стейта
    if (userId === currentUserId) {
      return cards.find((c) => c.date?.slice(0, 10) === key);
    }
    return undefined;
  };

  // Открыть модалку создания/редактирования
  const openEditModal = (date: Date, existing?: TaskCard) => {
    setSelectedDate(format(date, "yyyy-MM-dd"));
    if (existing) {
      setEditingCard(existing);
      setForm({
        title: existing.title,
        description: existing.description,
        artifactLink: existing.artifactLink,
      });
    } else {
      setEditingCard(null);
      setForm({ title: "", description: "", artifactLink: "" });
    }
    setModalOpen(true);
  };

  // Optimistic save
  const handleSave = async () => {
    if (!form.title.trim() || !applicationId) return;
    setSaving(true);

    const optimisticCard: TaskCard = editingCard
      ? { ...editingCard, ...form, updatedAt: new Date().toISOString() }
      : {
          id: "temp-" + Date.now(),
          applicationId,
          date: selectedDate,
          ...form,
          artifactLink: form.artifactLink || "",
          updatedAt: new Date().toISOString(),
        };

    setCards((prev) => {
      if (editingCard) return prev.map((c) => (c.id === editingCard.id ? optimisticCard : c));
      return [...prev, optimisticCard];
    });
    setModalOpen(false);

    try {
      if (editingCard) {
        const updated = await api.taskCards.update(applicationId, editingCard.id, form);
        setCards((prev) => prev.map((c) => (c.id === optimisticCard.id ? updated : c)));
      } else {
        const data: CreateTaskCardDto = { applicationId, date: selectedDate, ...form };
        const created = await api.taskCards.create(applicationId, data);
        setCards((prev) => prev.map((c) => (c.id === optimisticCard.id ? created : c)));
      }
    } catch {
      setCards((prev) => prev.filter((c) => c.id !== optimisticCard.id));
      setModalOpen(true);
    } finally {
      setSaving(false);
    }
  };

  // Навигация по неделям (через timestamp для надёжного сравнения)
  const minWeek = practiceStart ? startOfWeek(practiceStart, { weekStartsOn: 1 }).getTime() : 0;
  const maxWeek = practiceEnd
    ? startOfWeek(endOfWeek(practiceEnd, { weekStartsOn: 1 }), { weekStartsOn: 1 }).getTime()
    : 0;

  const goToPrevWeek = () => {
    setCurrentWeekStart((w) => {
      if (!minWeek) return w;
      const prev = subWeeks(w, 1).getTime();
      return new Date(prev < minWeek ? minWeek : prev);
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((w) => {
      if (!maxWeek) return w;
      const next = addWeeks(w, 1).getTime();
      return new Date(next > maxWeek ? maxWeek : next);
    });
  };

  const canGoPrev = minWeek > 0 && currentWeekStart.getTime() > minWeek;
  const canGoNext = maxWeek > 0 && currentWeekStart.getTime() < maxWeek;

  // Выбор даты в календаре
  const handleCalendarSelect = (date: Date) => {
    if (!minWeek || !maxWeek) return;
    const weekStartMs = startOfWeek(date, { weekStartsOn: 1 }).getTime();
    const clampedMs = weekStartMs < minWeek ? minWeek : weekStartMs > maxWeek ? maxWeek : weekStartMs;
    setCurrentWeekStart(new Date(clampedMs));
    setCalendarOpen(false);
  };

  // Состояние загрузки
  if (!cohort) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Задачи</h2>
          <p className="text-muted-foreground">Ежедневный отчёт о выполненной работе</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Вы не зачислены ни на одну практику.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!applicationId && !loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Задачи</h2>
          <p className="text-muted-foreground">Ежедневный отчёт о выполненной работе</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Нет одобренной заявки</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            value={form.artifactLink}
            onChange={(e) => setForm((f) => ({ ...f, artifactLink: e.target.value }))}
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
            <PopoverContent className="w-auto p-0 bg-background border shadow-lg" align="center" side="bottom">
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
                        const inPractice = isDayInPractice(day);
                        // Можно кликать: свои (в пределах практики) или чужие с карточкой
                        const canClick = (isOwn && inPractice) || card;

                        const handleClick = () => {
                          if (!canClick) return;
                          if (isOwn) {
                            openEditModal(day, card);
                          } else if (card) {
                            setViewingCard(card);
                            setViewModalOpen(true);
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
                                  : isOwn && inPractice
                                    ? "hover:bg-muted border border-transparent hover:border-dashed hover:border-muted-foreground/30 cursor-pointer"
                                    : "border border-transparent cursor-default opacity-40"
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
                                    {card.artifactLink && (
                                      <ExternalLink className="h-3 w-3 text-primary" />
                                    )}
                                    <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                      <Clock className="h-2.5 w-2.5" />
                                      {formatUpdatedAt(card.updatedAt)}
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

      {/* Модалка редактирования */}
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
              {viewingCard.artifactLink && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Артефакт</label>
                  <a
                    href={viewingCard.artifactLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {viewingCard.artifactLink}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
                <Clock className="h-3.5 w-3.5" />
                Обновлено: {formatUpdatedAt(viewingCard.updatedAt)}
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
