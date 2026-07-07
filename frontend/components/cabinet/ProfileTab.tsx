"use client";

import { useAuth } from "@/shared/hooks/use-auth";
import { useSurveyData } from "@/shared/hooks/use-survey-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Mail,
  Calendar,
  Hash,
  ClipboardList,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/shared/api/client";
import { SurveyField } from "@/shared/api/types";

const COHORT_ID = "test-cohort-id";

const fieldLabels: Record<string, string> = {
  fio: "ФИО",
  group: "Группа",
  course: "Курс",
  desired_role: "Желаемая роль",
  tech_stack: "Технологии",
};

export function ProfileTab() {
  const { user } = useAuth();
  const { data, setData, isEmpty } = useSurveyData(COHORT_ID);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<SurveyField[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    api.survey.getFields().then(setFields).catch(() => {});
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const startEditing = () => {
    setEditData({ ...data });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditData({});
  };

  const saveEditing = () => {
    setSaving(true);
    // Имитация задержки сохранения
    setTimeout(() => {
      setData(editData);
      setEditing(false);
      setSaving(false);
      showToast("success", "Данные анкеты сохранены");
    }, 300);
  };

  // Сортируем поля по order
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

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

      {/* Данные пользователя */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Данные пользователя
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-semibold">{user?.email || "—"}</p>
              <Badge variant="secondary">Студент</Badge>
            </div>
          </div>

          <div className="grid gap-4 pt-4 border-t">
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
        </CardContent>
      </Card>

      {/* Данные анкеты */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Данные анкеты
            </CardTitle>
            {!editing && (
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="mr-2 h-4 w-4" />
                {isEmpty ? "Заполнить" : "Изменить"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEmpty && !editing ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Данные анкеты не заполнены
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Заполните данные для участия в практике
              </p>
              <Button className="mt-4" size="sm" onClick={startEditing}>
                <Pencil className="mr-2 h-4 w-4" />
                Заполнить анкету
              </Button>
            </div>
          ) : editing ? (
            <div className="space-y-4">
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
                      value={editData[field.id] || ""}
                      onChange={(e) =>
                        setEditData((d) => ({ ...d, [field.id]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                    />
                  )}
                  {field.type === "textarea" && (
                    <Textarea
                      value={editData[field.id] || ""}
                      onChange={(e) =>
                        setEditData((d) => ({ ...d, [field.id]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                      rows={3}
                    />
                  )}
                  {field.type === "select" && field.options && (
                    <select
                      value={editData[field.id] || ""}
                      onChange={(e) =>
                        setEditData((d) => ({ ...d, [field.id]: e.target.value }))
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
              <div className="flex gap-2 pt-2">
                <Button onClick={saveEditing} disabled={saving} size="sm">
                  <Check className="mr-2 h-4 w-4" />
                  {saving ? "Сохранение..." : "Сохранить"}
                </Button>
                <Button variant="outline" onClick={cancelEditing} size="sm">
                  <X className="mr-2 h-4 w-4" />
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {sortedFields.map((field) => (
                <div key={field.id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm text-muted-foreground">{field.label}</p>
                    <p className="font-medium">{data[field.id] || "—"}</p>
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
    </div>
  );
}
