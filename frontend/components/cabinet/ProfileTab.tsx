"use client";

import { useAuth } from "@/shared/hooks/use-auth";
import { useSurveyData } from "@/shared/hooks/use-survey-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  User,
  Mail,
  Calendar,
  Hash,
  Pencil,
  GraduationCap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/shared/api/client";
import { SurveyField } from "@/shared/api/types";

const COHORT_ID = "test-cohort-id";

export function ProfileTab() {
  const { user } = useAuth();
  const { data: surveyData, setData: setSurveyData } = useSurveyData(COHORT_ID);
  const [fields, setFields] = useState<SurveyField[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    api.survey.getFields().then(setFields).catch(() => {});
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const openModal = () => {
    setForm({ ...surveyData });
    setModalOpen(true);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSurveyData(form);
      setModalOpen(false);
      setSaving(false);
      showToast("success", "Данные профиля обновлены");
    }, 300);
  };

  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  // Маппинг полей анкеты для отображения
  const surveyDisplay: Array<{ label: string; value: string }> = sortedFields.map((f) => ({
    label: f.label,
    value: surveyData[f.id] || "",
  }));

  return (
    <div className="space-y-6">
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

      <div>
        <h2 className="text-2xl font-bold">Профиль</h2>
        <p className="text-muted-foreground">Информация о вашем аккаунте</p>
      </div>

      {/* Карточка: пользователь + данные анкеты */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Данные пользователя
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={openModal}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Аватар + email */}
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-semibold">{user?.email || "—"}</p>
              <Badge variant="secondary">Студент</Badge>
            </div>
          </div>

          {/* Основные данные */}
          <div className="grid gap-4 border-t pt-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">ID пользователя</p>
                <p className="font-medium font-mono text-sm">{user?.id || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Дата регистрации</p>
                <p className="font-medium">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("ru-RU", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Данные анкеты */}
          {surveyDisplay.length > 0 && (
            <div className="grid gap-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Данные анкеты
                </p>
              </div>
              {surveyDisplay.map((item) => (
                <div key={item.label} className="flex items-start gap-3 pl-7">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="font-medium">{item.value || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Текущая практика */}
      <Card>
        <CardHeader>
          <CardTitle>Текущая практика</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 px-3 py-1.5">
              <p className="text-sm font-medium text-primary">Тестовая когорта</p>
            </div>
            <Badge variant="outline">Активна</Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Летняя практика 2024 — Июль-Август
          </p>
        </CardContent>
      </Card>

      {/* Модалка редактирования */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактирование профиля</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Поля анкеты */}
            {sortedFields.map((field) => (
              <div key={field.id}>
                <label className="mb-1.5 block text-sm font-medium">
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </label>
                {field.type === "text" && (
                  <Input
                    value={form[field.id] || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [field.id]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                  />
                )}
                {field.type === "textarea" && (
                  <Textarea
                    value={form[field.id] || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [field.id]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    rows={3}
                  />
                )}
                {field.type === "select" && field.options && (
                  <select
                    value={form[field.id] || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [field.id]: e.target.value }))
                    }
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
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
