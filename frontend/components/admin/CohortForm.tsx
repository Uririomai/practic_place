"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Cohort } from "@/shared/api/types";
import { useEffect, useState } from "react";

interface CohortFormProps {
  cohort?: Cohort | null;
  onSave: (data: Omit<Cohort, 'id'>) => Promise<void>;
  onCancel: () => void;
}

const cohortSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  applicationStart: z.string().min(1, "Дата начала приёма обязательна"),
  applicationEnd: z.string().min(1, "Дата окончания приёма обязательна"),
  practiceStart: z.string().min(1, "Дата начала практики обязательна"),
  practiceEnd: z.string().min(1, "Дата окончания практики обязательна"),
}).refine(
  (data) => data.applicationEnd < data.practiceStart,
  { message: "Приём заявок должен заканчиваться до начала практики", path: ["applicationEnd"] }
).refine(
  (data) => data.practiceStart < data.practiceEnd,
  { message: "Практика должна заканчиваться позже начала", path: ["practiceEnd"] }
);

type CohortFormData = z.infer<typeof cohortSchema>;

export function CohortForm({ cohort, onSave, onCancel }: CohortFormProps) {
  const [saving, setSaving] = useState(false);

  const form = useForm<CohortFormData>({
    resolver: zodResolver(cohortSchema),
    defaultValues: {
      name: "",
      applicationStart: "",
      applicationEnd: "",
      practiceStart: "",
      practiceEnd: "",
    },
  });

  useEffect(() => {
    if (cohort) {
      form.reset({
        name: cohort.name,
        applicationStart: cohort.applicationStart,
        applicationEnd: cohort.applicationEnd,
        practiceStart: cohort.practiceStart,
        practiceEnd: cohort.practiceEnd,
      });
    }
  }, [cohort, form]);

  const onSubmit = async (data: CohortFormData) => {
    setSaving(true);
    try {
      await onSave(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormItem>
        <FormLabel required>Название когорты</FormLabel>
        <Input {...form.register("name")} placeholder="Летняя практика 2026" />
        {form.formState.errors.name?.message && (
          <FormMessage>{form.formState.errors.name.message}</FormMessage>
        )}
      </FormItem>

      <div className="grid grid-cols-2 gap-4">
        <FormItem>
          <FormLabel required>Начало приёма заявок</FormLabel>
          <Input type="date" {...form.register("applicationStart")} />
          {form.formState.errors.applicationStart?.message && (
            <FormMessage>{form.formState.errors.applicationStart.message}</FormMessage>
          )}
        </FormItem>
        <FormItem>
          <FormLabel required>Окончание приёма заявок</FormLabel>
          <Input type="date" {...form.register("applicationEnd")} />
          {form.formState.errors.applicationEnd?.message && (
            <FormMessage>{form.formState.errors.applicationEnd.message}</FormMessage>
          )}
        </FormItem>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormItem>
          <FormLabel required>Начало практики</FormLabel>
          <Input type="date" {...form.register("practiceStart")} />
          {form.formState.errors.practiceStart?.message && (
            <FormMessage>{form.formState.errors.practiceStart.message}</FormMessage>
          )}
        </FormItem>
        <FormItem>
          <FormLabel required>Окончание практики</FormLabel>
          <Input type="date" {...form.register("practiceEnd")} />
          {form.formState.errors.practiceEnd?.message && (
            <FormMessage>{form.formState.errors.practiceEnd.message}</FormMessage>
          )}
        </FormItem>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Сохранение..." : cohort ? "Сохранить" : "Создать"}
        </Button>
      </div>
    </form>
  );
}
