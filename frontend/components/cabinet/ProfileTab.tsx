"use client";

import { useAuth } from "@/shared/hooks/use-auth";
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
  User as UserIcon,
  Mail,
  Calendar,
  Hash,
  Pencil,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/shared/api/client";
import { UserProfile, Cohort } from "@/shared/api/types";

/** Мета полей профиля */
const PROFILE_FIELDS: Array<{
  key: keyof UserProfile;
  label: string;
  type: "input" | "textarea";
  placeholder?: string;
}> = [
  { key: "student_fio", label: "ФИО студента", type: "input", placeholder: "Иванов Иван Иванович" },
  { key: "student_fio_genitive", label: "ФИО в родительном падеже", type: "input", placeholder: "Иванова Ивана Ивановича" },
  { key: "group", label: "Группа", type: "input", placeholder: "РИ-330930" },
  { key: "direction_code", label: "Код направления", type: "input", placeholder: "09.03.03" },
  { key: "direction_name", label: "Наименование направления", type: "input", placeholder: "Прикладная информатика" },
  { key: "program_name", label: "Наименование образовательной программы", type: "input" },
  { key: "specialty", label: "Специальность", type: "input", placeholder: "Направление подготовки" },
  { key: "practice_topic", label: "Тема практики", type: "input", placeholder: "Тема задания" },
  { key: "main_stage_tasks", label: "Перечень работ основного этапа", type: "textarea", placeholder: "Список задач" },
  { key: "university_supervisor", label: "Руководитель практики от вуза", type: "input", placeholder: "Петров Петр Петрович" },
];

/** Проверка: все ли поля профиля заполнены */
function isProfileComplete(profile?: UserProfile): boolean {
  if (!profile) return false;
  return PROFILE_FIELDS.every((f) => profile[f.key]?.trim());
}

/** Процент заполнения профиля */
function getProfileCompletion(profile?: UserProfile): number {
  if (!profile) return 0;
  const filled = PROFILE_FIELDS.filter((f) => profile[f.key]?.trim()).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

/** Круговой прогресс-бар */
function CircularProgress({ percent }: { percent: number }) {
  const radius = 36;
  const stroke = 5;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="currentColor"
          className="text-muted/30"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="currentColor"
          className="text-yellow-500"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span className="absolute text-xs font-bold">{percent}%</span>
    </div>
  );
}

export function ProfileTab() {
  const { user, setUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const profile = user?.profile;
  const profileComplete = isProfileComplete(profile);
  const profilePercent = getProfileCompletion(profile);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const openModal = () => {
    // Заполняем форму текущими данными профиля
    const formData: Record<string, string> = {};
    PROFILE_FIELDS.forEach((f) => {
      formData[f.key] = profile?.[f.key] || "";
    });
    setForm(formData);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updated = await api.users.updateProfile(user.id, form as UserProfile);
      // Обновляем user в useAuth
      setUser(updated);
      setModalOpen(false);
      showToast("success", "Данные профиля обновлены");
    } catch {
      showToast("error", "Не удалось сохранить данные");
    } finally {
      setSaving(false);
    }
  };

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

      {/* Предупреждение: профиль не полностью заполнен */}
      {!profileComplete && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-5 flex items-center gap-4">
          <CircularProgress percent={profilePercent} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-yellow-800">Заполните данные профиля</p>
            <p className="mt-1 text-sm text-yellow-700">
              Заполнено {profilePercent}% — чтобы продолжить работу с платформой, заполните все поля: ФИО, группа, код направления и другие.
            </p>
          </div>
          <Button
            size="sm"
            onClick={openModal}
            className="shrink-0 bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Заполнить данные
          </Button>
        </div>
      )}

      {/* Карточка: пользователь */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
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
              <UserIcon className="h-8 w-8" />
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

          {/* Данные профиля */}
          <div className="grid gap-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Данные профиля
              </p>
            </div>
            {PROFILE_FIELDS.map((field) => (
              <div key={field.key} className="flex items-start gap-3 pl-7">
                <div>
                  <p className="text-sm text-muted-foreground">{field.label}</p>
                  <p className="font-medium">{profile?.[field.key] || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Когорты */}
      {user?.cohorts && user.cohorts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Практики</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {user.cohorts.map((cohort: Cohort) => (
                <div
                  key={cohort.id}
                  className={`rounded-lg border p-4 ${
                    cohort.id === user.activeCohortId
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{cohort.name}</p>
                    {cohort.id === user.activeCohortId && (
                      <Badge className="bg-primary text-xs">Активная</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      Практика: {new Date(cohort.practiceStart).toLocaleDateString("ru-RU")} — {new Date(cohort.practiceEnd).toLocaleDateString("ru-RU")}
                    </p>
                    <p>
                      Заявки: {new Date(cohort.applicationStart).toLocaleDateString("ru-RU")} — {new Date(cohort.applicationEnd).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Модалка редактирования */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактирование профиля</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {PROFILE_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="mb-1.5 block text-sm font-medium">
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={form[field.key] || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    rows={3}
                  />
                ) : (
                  <Input
                    value={form[field.key] || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                  />
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
