"use client";

import { useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";

// Все переменные для шаблонов документов
const VARIABLES = [
  { key: "student_fio", label: "ФИО студента" },
  { key: "student_fio_genitive", label: "ФИО в родительном падеже" },
  { key: "student_fio_title", label: "ФИО в формате Фамилия И.О." },
  { key: "group", label: "Группа" },
  { key: "direction_code", label: "Код направления" },
  { key: "direction_name", label: "Название направления" },
  { key: "program_name", label: "Образовательная программа" },
  { key: "specialty", label: "Специальность" },
  { key: "practice_topic", label: "Тема практики" },
  { key: "university_supervisor", label: "Руководитель от вуза" },
  { key: "university_supervisor_title", label: "Руководитель (Фамилия И.О.)" },
  { key: "main_stage_tasks", label: "Задачи этапа" },
  { key: "review_activities", label: "Мероприятия за время практики" },
  { key: "review_characteristic", label: "Характеристика" },
  { key: "review_employed", label: "Трудоустроен (да/нет)" },
  { key: "review_next_practice", label: "Следующая практика (да/нет)" },
  { key: "review_employment_offer", label: "Предложение работы (да/нет)" },
  { key: "review_suggestions", label: "Предложения и замечания" },
  { key: "review_grade", label: "Оценка за практику" },
  { key: "practice_start", label: "Дата начала практики" },
  { key: "practice_end", label: "Дата окончания практики" },
  { key: "cohort_name", label: "Название когорты" },
  { key: "role_name", label: "Роль в когорте" },
  { key: "user_email", label: "Email студента" },
];

interface VariableHintsProps {
  open: boolean;
  onClose: () => void;
}

export function VariableHints({ open, onClose }: VariableHintsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(`{{${key}}}`);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {}
  };

  if (!open) return null;

  return (
    <div className="space-y-0.5 overflow-y-auto flex-1 min-h-0">
      {VARIABLES.map((v) => (
        <button
          key={v.key}
          onClick={() => handleCopy(v.key)}
          className="w-full text-left px-2 py-2 rounded-md hover:bg-muted/70 transition-colors group"
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            {copiedKey === v.key ? (
              <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
            )}
            <code className="text-[11px] font-mono text-primary font-medium">
              {'{{' + v.key + '}}'}
            </code>
          </div>
          <p className="text-[11px] text-muted-foreground pl-[18px] leading-snug">
            {v.label}
          </p>
        </button>
      ))}
    </div>
  );
}
