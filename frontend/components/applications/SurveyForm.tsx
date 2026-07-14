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
import { SurveyField, UserProfile } from "@/shared/api/types";
import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/hooks/use-auth";
import { useSurveyData } from "@/shared/hooks/use-survey-data";
import { useState, useEffect, useMemo } from "react";

interface SurveyFormProps {
  cohortId: string;
  fields: SurveyField[];
  onSuccess?: () => void;
}

// Маппинг полей анкеты → поля профиля
const SURVEY_TO_PROFILE: Record<string, keyof UserProfile> = {
  fio: "student_fio",
  group: "group",
};

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
  const { user, setUser } = useAuth();
  const { data: surveyData, setData: setSurveyData } = useSurveyData(cohortId);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Сортируем поля по order и нормализуем тип (TEXT → text) и options
  const sortedFields = [...fields]
    .sort((a, b) => a.order - b.order)
    .map(f => ({
      ...f,
      type: f.type.toLowerCase() as SurveyField['type'],
      options: Array.isArray(f.options) ? f.options : [],
    }));

  // Формируем defaultValues: профиль (бэкенд) → localStorage → пусто
  const defaultValues = useMemo(() => {
    const values: Record<string, string> = {};
    sortedFields.forEach((field) => {
      const profileKey = SURVEY_TO_PROFILE[field.id];
      const profileValue = profileKey ? user?.profile?.[profileKey] : undefined;
      values[field.id] = profileValue || surveyData[field.id] || "";
    });
    return values;
  }, [surveyData, fields, user?.profile]);

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(createSurveySchema(fields)),
    defaultValues,
  });

  // Сброс формы при изменении данных профиля (defaultValues читаются один раз)
  useEffect(() => {
    form.reset(defaultValues);
  }, [surveyData, fields, user?.profile]);

  const onSubmit = async (data: SurveyFormData) => {
    setSubmitting(true);
    try {
      // Фильтруем undefined значения
      const surveyPayload: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) surveyPayload[key] = value;
      }

      // 1. Создаём заявку
      const app = await api.applications.submit({ cohortId });

      // 2. Сохраняем ответы анкеты через PUT /applications/:id/answers
      const answers = Object.entries(surveyPayload).map(([fieldId, value]) => ({
        fieldId,
        value,
      }));
      if (answers.length > 0) {
        await api.applications.saveAnswers(app.id, answers);
      }

      // Сохраняем данные в профиль (двусторонняя синхронизация)
      setSurveyData(surveyPayload);

      // Сохраняем fio и group в профиль, если их там нет
      if (user) {
        const profileUpdates: Partial<UserProfile> = {};
        for (const [surveyFieldId, profileKey] of Object.entries(SURVEY_TO_PROFILE)) {
          const value = surveyPayload[surveyFieldId];
          if (value && !user.profile?.[profileKey]) {
            profileUpdates[profileKey] = value;
          }
        }
        if (Object.keys(profileUpdates).length > 0) {
          try {
            const updated = await api.users.updateProfile(user.id, profileUpdates as UserProfile);
            setUser(updated);
          } catch {
            // Не критично — профиль обновится позже
          }
        }
      }

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
