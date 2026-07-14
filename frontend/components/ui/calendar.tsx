"use client";

import * as React from "react";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isAfter,
  isBefore,
  startOfDay,
  startOfWeek,
  endOfWeek,
  isWeekend,
  isWithinInterval,
} from "date-fns";
import { ru } from "date-fns/locale";

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  disabledBefore?: Date;
  disabledAfter?: Date;
  /** Выделять неделю вокруг выбранной даты (по умолчанию true) */
  selectWeek?: boolean;
}

export function Calendar({ selected, onSelect, disabledBefore, disabledAfter, selectWeek = true }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Пн=0, Вт=1, ..., Вс=6 → сдвиг для пн-пт сетки
  const startDayOfWeek = (getDay(monthStart) + 6) % 7; // 0=пн, 6=вс

  // Выделенная неделя (пн-пт)
  const selectedWeek = selected
    ? {
        start: startOfWeek(selected, { weekStartsOn: 1 }),
        end: endOfWeek(selected, { weekStartsOn: 1 }),
      }
    : null;

  const isInSelectedWeek = (date: Date) => {
    if (!selectedWeek) return false;
    return isWithinInterval(date, { start: selectedWeek.start, end: selectedWeek.end }) && !isWeekend(date);
  };

  const isDisabled = (date: Date) => {
    const d = startOfDay(date);
    if (disabledBefore && isBefore(d, startOfDay(disabledBefore))) return true;
    if (disabledAfter && isAfter(d, startOfDay(disabledAfter))) return true;
    return false;
  };

  const weekDayHeaders = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return (
    <div className="p-4 w-[320px] bg-white">
      {/* Навигация по месяцам */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium capitalize">
          {format(currentMonth, "LLLL yyyy", { locale: ru })}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Заголовки дней недели */}
      <div className="grid grid-cols-7 mb-2">
        {weekDayHeaders.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1.5">
            {day}
          </div>
        ))}
      </div>

      {/* Сетка дней */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Пустые ячейки до первого дня месяца */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-9" />
        ))}

        {/* Дни месяца */}
        {daysInMonth.map((day) => {
          const disabled = isDisabled(day);
          const isSelectedDay = selected && isSameDay(day, selected);
          const isInWeek = selectWeek && isInSelectedWeek(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <button
              key={day.toISOString()}
              onClick={() => !disabled && onSelect?.(day)}
              disabled={disabled}
              className={`
                h-9 w-full text-sm rounded-md transition-colors
                ${disabled ? "text-muted-foreground/30 cursor-not-allowed" : "hover:bg-primary/10 cursor-pointer"}
                ${isSelectedDay ? "bg-primary text-primary-foreground hover:bg-primary font-medium" : ""}
                ${isInWeek && !isSelectedDay ? "bg-primary/15 text-primary" : ""}
                ${!isCurrentMonth ? "text-muted-foreground/40" : ""}
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Подпись выбранной недели */}
      {selectWeek && selectedWeek && (
        <div className="mt-3 pt-3 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Неделя: {format(selectedWeek.start, "d MMMM", { locale: ru })} — {format(selectedWeek.end, "d MMMM", { locale: ru })}
          </p>
        </div>
      )}
    </div>
  );
}
