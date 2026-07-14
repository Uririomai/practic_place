"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskCard, Cohort, AdminApplication } from "@/shared/api/types";
import { api } from "@/shared/api/client";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ExternalLink,
  Clock,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isWeekend,
  format,
  addWeeks,
  subWeeks,
  parseISO,
  isSameDay,
} from "date-fns";
import { ru } from "date-fns/locale";

interface AdminTasksViewProps {
  cohort: Cohort;
}

interface Participant {
  userId: string;
  fio: string;
  email: string;
  role: string;
  applicationId: string;
}

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

export function AdminTasksView({ cohort }: AdminTasksViewProps) {
  const [tasks, setTasks] = useState<TaskCard[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewingCard, setViewingCard] = useState<TaskCard | null>(null);
  const [viewingParticipant, setViewingParticipant] = useState<Participant | null>(null);

  // Даты практики (мемоизированы)
  const practiceStart = useMemo(() => parseISO(cohort.practiceStart), [cohort.practiceStart]);
  const practiceEnd = useMemo(() => parseISO(cohort.practiceEnd), [cohort.practiceEnd]);

  // Начальная неделя
  const getInitialWeek = (): Date => {
    const today = new Date();
    const firstWeek = startOfWeek(practiceStart, { weekStartsOn: 1 });
    const lastWeek = startOfWeek(endOfWeek(practiceEnd, { weekStartsOn: 1 }), { weekStartsOn: 1 });
    const currentWeek = startOfWeek(today, { weekStartsOn: 1 });
    if (today < practiceStart) return firstWeek;
    if (currentWeek < firstWeek) return firstWeek;
    if (currentWeek > lastWeek) return lastWeek;
    return currentWeek;
  };

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getInitialWeek);

  // Загрузка заявок + задач
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api.admin
      .getApplications([cohort.id])
      .then(async (apps) => {
        if (cancelled) return;

        // Только одобренные заявки
        const approved = apps.filter((a) => a.status?.toLowerCase() === "approved");

        // Строим участников из заявок
        const parts: Participant[] = approved.map((a) => ({
          userId: a.user.id,
          fio: a.user.fio || a.user.email,
          email: a.user.email,
          role: a.role?.name || "Студент",
          applicationId: a.id,
        }));
        setParticipants(parts);

        // Загружаем задачи для каждой заявки
        const taskResults = await Promise.all(
          approved.map(async (a) => {
            try {
              const appTasks = await api.taskCards.listByApplication(a.id);
              // Добавляем userId к каждой задаче
              return appTasks;
            } catch {
              return [];
            }
          })
        );

        if (!cancelled) {
          setTasks(taskResults.flat());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTasks([]);
          setParticipants([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [cohort.id]);

  // Дни недели (пн-пт)
  const weekDays = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end: weekEnd }).filter(
      (day) => !isWeekend(day)
    );
  }, [currentWeekStart]);

  // Задачи по заявке и дню (нормализуем дату — берём только yyyy-MM-dd)
  const getCardForDay = (day: Date, applicationId: string): TaskCard | undefined => {
    const key = format(day, "yyyy-MM-dd");
    return tasks.find((t) => {
      if (t.applicationId !== applicationId) return false;
      // Нормализуем: из "2026-07-14T00:00:00.000Z" или "2026-07-14" берём "2026-07-14"
      const taskDate = t.date?.slice(0, 10);
      return taskDate === key;
    });
  };

  // Участники, сгруппированные по ролям (без дефолтной "Студент")
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => a.role.localeCompare(b.role));
  }, [participants]);

  // Есть ли хотя бы одна реальная роль (не "Студент")
  const hasNamedRoles = useMemo(() => {
    return participants.some((p) => p.role && p.role !== "Студент");
  }, [participants]);

  const roleGroups = useMemo(() => {
    const groups = new Map<string, Participant[]>();
    sortedParticipants.forEach((p) => {
      // Если есть именованные роли — "Студент" группируем без бейджа
      const groupKey = hasNamedRoles && (!p.role || p.role === "Студент") ? "" : p.role;
      const existing = groups.get(groupKey) || [];
      groups.set(groupKey, [...existing, p]);
    });
    return groups;
  }, [sortedParticipants, hasNamedRoles]);

  // Навигация (через timestamp)
  const minWeek = startOfWeek(practiceStart, { weekStartsOn: 1 }).getTime();
  const maxWeek = startOfWeek(endOfWeek(practiceEnd, { weekStartsOn: 1 }), { weekStartsOn: 1 }).getTime();

  const goToPrevWeek = () => {
    setCurrentWeekStart((w) => {
      const prev = subWeeks(w, 1).getTime();
      return new Date(prev < minWeek ? minWeek : prev);
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((w) => {
      const next = addWeeks(w, 1).getTime();
      return new Date(next > maxWeek ? maxWeek : next);
    });
  };

  const canGoPrev = currentWeekStart.getTime() > minWeek;
  const canGoNext = currentWeekStart.getTime() < maxWeek;

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const isWeekInPractice =
    currentWeekStart <= practiceEnd && weekEnd >= practiceStart;

  const totalWeeks = useMemo(() => {
    const start = startOfWeek(practiceStart, { weekStartsOn: 1 });
    const end = endOfWeek(practiceEnd, { weekStartsOn: 1 });
    return Math.round((end.getTime() - start.getTime()) / (7 * 86400000)) + 1;
  }, [practiceStart, practiceEnd]);

  const currentWeekNumber = useMemo(() => {
    const practiceWeekStart = startOfWeek(practiceStart, { weekStartsOn: 1 });
    return Math.round((currentWeekStart.getTime() - practiceWeekStart.getTime()) / (7 * 86400000)) + 1;
  }, [currentWeekStart, practiceStart]);

  // Выбор даты в календаре
  const handleCalendarSelect = (date: Date) => {
    const weekStartMs = startOfWeek(date, { weekStartsOn: 1 }).getTime();
    const clampedMs = weekStartMs < minWeek ? minWeek : weekStartMs > maxWeek ? maxWeek : weekStartMs;
    setCurrentWeekStart(new Date(clampedMs));
    setCalendarOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Навигация */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={!canGoPrev} onClick={goToPrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-[220px] justify-center">
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {format(currentWeekStart, "d MMMM", { locale: ru })} —{" "}
                  {format(weekEnd, "d MMMM", { locale: ru })}
                </span>
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
          <Button variant="outline" size="sm" disabled={!canGoNext} onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Неделя {currentWeekNumber} из {totalWeeks}
        </div>
      </div>

      {/* Таблица */}
      {!isWeekInPractice ? (
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
                {weekDays.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <th
                      key={day.toISOString()}
                      className={`min-w-[160px] p-3 text-left font-medium text-muted-foreground ${
                        isToday ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs uppercase">
                          {format(day, "EEEE", { locale: ru })}
                        </span>
                        <span>
                          {format(day, "d MMMM", { locale: ru })}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Участники не найдены
                  </td>
                </tr>
              ) : (
                Array.from(roleGroups.entries()).map(([role, groupParticipants]) => (
                  <Fragment key={role}>
                    {/* Заголовок группы ролей (только для именованных ролей) */}
                    {roleGroups.size > 1 && role && (
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
                              <Link
                                href={`/admin/users/${participant.userId}?from=tasks`}
                                className="truncate font-medium hover:underline"
                              >
                                {participant.fio}
                              </Link>
                              {roleGroups.size > 1 && participant.role && participant.role !== "Студент" && (
                                <Badge variant="secondary" className={`mt-0.5 text-[10px] ${roleBadgeColor(participant.role)}`}>
                                  {participant.role}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Ячейки дней */}
                        {weekDays.map((day) => {
                          const card = getCardForDay(day, participant.applicationId);
                          return (
                            <td key={day.toISOString()} className="p-1.5">
                              <button
                                onClick={() => {
                                  if (card) {
                                    setViewingCard(card);
                                    setViewingParticipant(participant);
                                  }
                                }}
                                disabled={!card}
                                className={`w-full min-h-[60px] rounded-md p-2 text-left transition-colors ${
                                  card
                                    ? "bg-muted/50 border border-muted hover:bg-muted/70 cursor-pointer"
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
                                      {card.artifactLink && (
                                        <ExternalLink className="h-3 w-3 text-primary" />
                                      )}
                                      <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                        <Clock className="h-2.5 w-2.5" />
                                        {formatUpdatedAt(card.updatedAt)}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground/40">
                                    —
                                  </div>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Модалка просмотра задачи */}
      <Dialog open={!!viewingCard} onOpenChange={() => setViewingCard(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewingCard?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Информация об участнике */}
            {viewingParticipant && (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {viewingParticipant.fio.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="font-medium">{viewingParticipant.fio}</p>
                  {viewingParticipant.role && viewingParticipant.role !== "Студент" && (
                    <Badge variant="secondary" className={`mt-0.5 text-[10px] ${roleBadgeColor(viewingParticipant.role)}`}>
                      {viewingParticipant.role}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Дата */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>{viewingCard ? format(parseISO(viewingCard.date), "d MMMM yyyy, EEEE", { locale: ru }) : ""}</span>
            </div>

            {/* Описание */}
            {viewingCard?.description && (
              <div>
                <label className="text-sm font-medium">Описание</label>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {viewingCard.description}
                </p>
              </div>
            )}

            {/* Артефакт */}
            {viewingCard?.artifactLink && (
              <div>
                <label className="text-sm font-medium">Артефакт</label>
                <a
                  href={viewingCard.artifactLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  {viewingCard.artifactLink}
                </a>
              </div>
            )}

            {/* Время обновления */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Clock className="h-3 w-3" />
              <span>Обновлено: {viewingCard ? formatUpdatedAt(viewingCard.updatedAt) : ""}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
