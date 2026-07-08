"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SurveyField } from "@/shared/api/types";
import { api } from "@/shared/api/client";
import { useSurveyData } from "@/shared/hooks/use-survey-data";
import { useState, useEffect, useMemo } from "react";

interface SurveyFormProps {
  cohortId: string;
  fields: SurveyField[];
  onSuccess?: () => void;
}

// Динамическая схема валидации
const createSurveySchema = (fields: SurveyField[]) => {
  const shape: Record<string, z.ZodString | z.ZodOptional<z.ZodString>> = {};
  fields.forEach((field) => {
    if (field.required) {
      shape[field.id] = z.string().min(1, "Поле обязательно");
    } else {
      shape[field.id] = z.string().optional();
    }
  });
  return z.object(shape);
};

type SurveyFormData = z.infer<ReturnType<typeof createSurveySchema>>;

export function SurveyForm({ cohortId, fields, onSuccess }: SurveyFormProps) {
  const { data: surveyData, setData: setSurveyData } = useSurveyData(cohortId);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Сортируем поля по order
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  // Формируем defaultValues из данных профиля (localStorage)
  const defaultValues = useMemo(() => {
    const values: Record<string, string> = {};
    sortedFields.forEach((field) => {
      values[field.id] = surveyData[field.id] || "";
    });
    return values;
  }, [surveyData, fields]);

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(createSurveySchema(fields)),
    defaultValues,
  });

  // Сброс формы при изменении данных профиля (defaultValues читаются один раз)
  useEffect(() => {
    form.reset(defaultValues);
  }, [surveyData, fields]);

  const onSubmit = async (data: SurveyFormData) => {
    setSubmitting(true);
    try {
      // Фильтруем undefined значения
      const surveyPayload: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) surveyPayload[key] = value;
      }

      // Отправляем заявку
      await api.applications.submit({ cohortId, surveyData: surveyPayload });

      // Сохраняем данные в профиль (двусторонняя синхронизация)
      setSurveyData(surveyPayload);

      setIsSubmitted(true);
      showToast("success", "Заявка успешно отправлена!");
      onSuccess?.();
    } catch {
      showToast("error", "Ошибка при отправке. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-4">
        {toast && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium ${
              toast.type === "success"
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.message}
          </div>
        )}
        <div className="rounded-lg border bg-green-50 p-6 text-center">
          <h3 className="text-lg font-semibold text-green-800">
            Заявка успешно отправлена!
          </h3>
          <p className="mt-2 text-green-600">
            Данные анкеты сохранены в профиле
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {sortedFields.map((field) => (
          <FormItem key={field.id}>
            <FormLabel required={field.required}>{field.label}</FormLabel>
            {field.type === "text" && (
              <Input
                {...form.register(field.id)}
                placeholder={field.placeholder}
              />
            )}
            {field.type === "textarea" && (
              <Textarea
                {...form.register(field.id)}
                placeholder={field.placeholder}
                rows={3}
              />
            )}
            {field.type === "select" && field.options && (
              <select
                {...form.register(field.id)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="">Выберите...</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
            {form.formState.errors[field.id]?.message && (
              <FormMessage>
                {String(form.formState.errors[field.id]?.message)}
              </FormMessage>
            )}
          </FormItem>
        ))}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Отправка..." : "Отправить заявку"}
        </Button>
      </form>
    </div>
  );
}
