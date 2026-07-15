"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";

export interface BasicInfoData {
  name: string;
  applicationStart: string;
  applicationEnd: string;
  practiceStart: string;
  practiceEnd: string;
}

interface StepBasicInfoProps {
  data: BasicInfoData;
  onChange: (data: BasicInfoData) => void;
  onValidChange: (valid: boolean) => void;
}

const schema = z.object({
  name: z.string().min(1, "Название обязательно"),
  applicationStart: z.string().min(1, "Дата начала приёма обязательна"),
  applicationEnd: z.string().min(1, "Дата окончания приёма обязательна"),
  practiceStart: z.string().min(1, "Дата начала практики обязательна"),
  practiceEnd: z.string().min(1, "Дата окончания практики обязательна"),
}).refine(
  (data) => !data.applicationStart || !data.applicationEnd || data.applicationStart < data.applicationEnd,
  { message: "Начало приёма должно быть раньше окончания", path: ["applicationEnd"] }
).refine(
  (data) => !data.applicationEnd || !data.practiceStart || data.applicationEnd < data.practiceStart,
  { message: "Приём заявок должен заканчиваться до начала практики", path: ["applicationEnd"] }
).refine(
  (data) => !data.practiceStart || !data.practiceEnd || data.practiceStart < data.practiceEnd,
  { message: "Начало практики должно быть раньше окончания", path: ["practiceEnd"] }
);

type FormData = z.infer<typeof schema>;

/** Строка YYYY-MM-DD или ISO → Date (без timezonа) */
function parseDate(str: string): Date | undefined {
  if (!str) return undefined;
  // Если ISO (содержит T), парсим как есть, берём только дату
  if (str.includes("T")) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? undefined : d;
  }
  // Иначе YYYY-MM-DD
  const [y, m, d] = str.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
}

/** Date → строка YYYY-MM-DD */
function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (dateStr: string) => void;
  disabledBefore?: Date;
  disabledAfter?: Date;
  error?: string;
}

function DateField({ label, value, onChange, disabledBefore, disabledAfter, error }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const date = parseDate(value);

  return (
    <FormItem>
      <FormLabel required>{label}</FormLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-start text-left font-normal ${!date ? "text-muted-foreground" : ""}`}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {date ? format(date, "d MMMM yyyy", { locale: ru }) : "Выберите дату"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" side="bottom">
          <Calendar
            selected={date}
            onSelect={(d) => {
              if (d) {
                onChange(toDateStr(d));
                setOpen(false);
              }
            }}
            disabledBefore={disabledBefore}
            disabledAfter={disabledAfter}
            selectWeek={false}
          />
        </PopoverContent>
      </Popover>
      {error && <FormMessage>{error}</FormMessage>}
    </FormItem>
  );
}

export function StepBasicInfo({ data, onChange, onValidChange }: StepBasicInfoProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: data,
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = form.watch((value) => {
      onChange(value as BasicInfoData);
      onValidChange(form.formState.isValid);
    });
    return () => subscription.unsubscribe();
  }, [form, onChange, onValidChange]);

  useEffect(() => {
    onValidChange(form.formState.isValid);
  }, [form.formState.isValid, onValidChange]);

  const appEnd = form.watch("applicationEnd");
  const practiceStart = form.watch("practiceStart");
  const practiceEnd = form.watch("practiceEnd");

  return (
    <div className="space-y-4">
      <FormItem>
        <FormLabel required>Название когорты</FormLabel>
        <Input {...form.register("name")} placeholder="Летняя практика 2026" />
        {form.formState.errors.name?.message && (
          <FormMessage>{form.formState.errors.name.message}</FormMessage>
        )}
      </FormItem>

      <div className="grid grid-cols-2 gap-4">
        <DateField
          label="Начало приёма заявок"
          value={form.watch("applicationStart")}
          onChange={(v) => form.setValue("applicationStart", v, { shouldValidate: true })}
          disabledAfter={appEnd ? parseDate(appEnd) : undefined}
          error={form.formState.errors.applicationStart?.message}
        />
        <DateField
          label="Окончание приёма заявок"
          value={appEnd}
          onChange={(v) => form.setValue("applicationEnd", v, { shouldValidate: true })}
          disabledBefore={parseDate(form.watch("applicationStart"))}
          disabledAfter={practiceStart ? parseDate(practiceStart) : undefined}
          error={form.formState.errors.applicationEnd?.message}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DateField
          label="Начало практики"
          value={practiceStart}
          onChange={(v) => form.setValue("practiceStart", v, { shouldValidate: true })}
          disabledBefore={appEnd ? new Date(parseDate(appEnd)!.getTime() + 86400000) : undefined}
          disabledAfter={practiceEnd ? parseDate(practiceEnd) : undefined}
          error={form.formState.errors.practiceStart?.message}
        />
        <DateField
          label="Окончание практики"
          value={practiceEnd}
          onChange={(v) => form.setValue("practiceEnd", v, { shouldValidate: true })}
          disabledBefore={practiceStart ? new Date(parseDate(practiceStart)!.getTime() + 86400000) : undefined}
          error={form.formState.errors.practiceEnd?.message}
        />
      </div>
    </div>
  );
}
