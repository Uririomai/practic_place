"use client";

import { UserProfile } from "@/shared/api/types";

interface StudentDataTabProps {
  profile?: UserProfile;
}

const profileFields: Array<{ key: keyof UserProfile; label: string }> = [
  { key: "student_fio", label: "ФИО студента" },
  { key: "group", label: "Группа" },
  { key: "direction_code", label: "Код направления" },
  { key: "direction_name", label: "Наименование направления" },
  { key: "program_name", label: "Наименование образовательной программы" },
  { key: "specialty", label: "Специальность" },
  { key: "practice_topic", label: "Тема практики" },
  { key: "main_stage_tasks", label: "Перечень работ основного этапа" },
];

export function StudentDataTab({ profile }: StudentDataTabProps) {
  if (!profile) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Данные профиля не заполнены
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      {profileFields.map((field) => (
        <div key={field.key} className="flex justify-between py-2 border-b last:border-0">
          <span className="text-sm text-muted-foreground">{field.label}</span>
          <span className="text-sm font-medium text-right max-w-[60%]">
            {profile[field.key] || "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
