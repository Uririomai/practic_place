"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Loader2 } from "lucide-react";
import { StepIndicator } from "./cohort-wizard/StepIndicator";
import { StepBasicInfo, BasicInfoData } from "./cohort-wizard/StepBasicInfo";
import { StepRoles } from "./cohort-wizard/StepRoles";
import { StepSurvey, SurveyFieldData, getInitialSurveyFields } from "./cohort-wizard/StepSurvey";
import { StepTestTask } from "./cohort-wizard/StepTestTask";
import { StepDocuments, LocalDocument } from "./cohort-wizard/StepDocuments";
import { api } from "@/shared/api/client";

const STORAGE_KEY = "cohort-wizard-draft";

interface CohortWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const STEPS = [
  { title: "Основная информация", required: true },
  { title: "Роли", required: true },
  { title: "Анкета", required: true },
  { title: "Тестовое задание", required: true },
  { title: "Документы", required: true },
];

interface WizardDraft {
  currentStep: number;
  completedSteps: number[];
  skippedSteps: number[];
  basicInfo: BasicInfoData;
  roles: { name: string }[];
  surveyFields: SurveyFieldData[] | null;
  testTasksByRole: Record<string, string>;
}

function loadDraft(): WizardDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDraft(draft: WizardDraft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // игнорируем ошибки localStorage
  }
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

export function CohortWizard({ open, onClose, onCreated }: CohortWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hintsOpen, setHintsOpen] = useState(false);
  const [createdState, setCreatedState] = useState<"idle" | "creating" | "success" | "error">("idle");
  const [createdError, setCreatedError] = useState("");

  // Данные шагов
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    name: "",
    applicationStart: "",
    applicationEnd: "",
    practiceStart: "",
    practiceEnd: "",
  });
  const [roles, setRoles] = useState<{ name: string }[]>([]);
  const [surveyFields, setSurveyFields] = useState<SurveyFieldData[] | null>(null);
  const [testTasksByRole, setTestTasksByRole] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<LocalDocument[]>([]);

  // Валидация шагов
  const [step0Valid, setStep0Valid] = useState(false);

  // Загрузка черновика при монтировании
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setCurrentStep(draft.currentStep);
      setCompletedSteps(new Set(draft.completedSteps));
      setSkippedSteps(new Set(draft.skippedSteps || []));
      setBasicInfo(draft.basicInfo);
      setRoles(draft.roles);
      setSurveyFields(draft.surveyFields);
      setTestTasksByRole(draft.testTasksByRole ?? {});
    }
  }, []);

  // Сохранение черновика при изменениях
  useEffect(() => {
    saveDraft({
      currentStep,
      completedSteps: Array.from(completedSteps),
      skippedSteps: Array.from(skippedSteps),
      basicInfo,
      roles,
      surveyFields,
      testTasksByRole,
    });
  }, [currentStep, completedSteps, skippedSteps, basicInfo, roles, surveyFields, testTasksByRole]);

  const isStepValid = useCallback(
    (step: number): boolean => {
      switch (step) {
        case 0:
          return step0Valid;
        case 1:
          return roles.length > 0;
        case 2:
          return (surveyFields ?? getInitialSurveyFields(null, roles)).length > 0;
        case 3:
          return true;
        case 4:
          return true;
        default:
          return false;
      }
    },
    [step0Valid, roles, surveyFields]
  );

  const canProceed = isStepValid(currentStep);

  const handleNext = () => {
    if (!canProceed) return;
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    if (currentStep === 1 && surveyFields === null) {
      setSurveyFields(getInitialSurveyFields(null, roles));
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    setHintsOpen(false);
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setHintsOpen(false);
  };

  const handleSkip = () => {
    setSkippedSteps((prev) => new Set([...prev, currentStep]));
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    setHintsOpen(false);
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep || completedSteps.has(step)) {
      setCurrentStep(step);
      setHintsOpen(false);
    }
  };

  const handleCreate = async () => {
    setCreatedState("creating");
    setError("");
    try {
      // 1. Создать когорту
      const cohort = await api.admin.createCohort({
        name: basicInfo.name,
        applicationStart: basicInfo.applicationStart,
        applicationEnd: basicInfo.applicationEnd,
        practiceStart: basicInfo.practiceStart,
        practiceEnd: basicInfo.practiceEnd,
      });

      // 2. Создать роли
      let createdRoles: { id: string; name: string }[] = [];
      if (roles.length > 0) {
        createdRoles = await api.admin.saveRoles(cohort.id, { roles });
      }

      // 3. Сохранить поля анкеты
      const fields = surveyFields ?? getInitialSurveyFields(null, roles);
      if (fields.length > 0) {
        await api.admin.saveSurveyFields(cohort.id, { fields });
      }

      // 4. Тестовые задания по ролям
      const roleMap = new Map(createdRoles.map(r => [r.name, r.id]));
      for (const [roleName, content] of Object.entries(testTasksByRole)) {
        if (!content.trim()) continue;
        const roleId = roleMap.get(roleName);
        if (!roleId) continue;
        try {
          await api.admin.saveTestTask(cohort.id, {
            roleId,
            content: content.trim(),
          });
        } catch {
          // Игнорируем ошибку отдельного тестового задания
        }
      }

      // 5. Документы (если есть)
      for (const doc of documents) {
        try {
          await api.admin.createDocumentTemplate(cohort.id, doc.file, doc.name, doc.slug);
        } catch {
          // Игнорируем ошибку отдельного документа
        }
      }

      // Очистить черновик
      clearDraft();

      // Показать анимацию успеха
      setCreatedState("success");

      // Через 2 секунды закрыть
      setTimeout(() => {
        onCreated();
      }, 2000);
    } catch (err) {
      setCreatedState("error");
      setCreatedError(err instanceof Error ? err.message : "Не удалось создать когорту");
    }
  };

  const handleRolesChange = (newRoles: { name: string }[]) => {
    setRoles(newRoles);
    if (surveyFields) {
      setSurveyFields(
        surveyFields.map((f) => {
          if (f.label === "Желаемая роль") {
            return { ...f, options: newRoles.map((r) => r.name) };
          }
          return f;
        })
      );
    }
  };

  // Логика кнопок для каждого шага
  const isLastStep = currentStep === STEPS.length - 1;
  const showSkipForTest = currentStep === 3 && Object.values(testTasksByRole).every(v => !v.trim());
  const showSkipForDocs = currentStep === 4 && documents.length === 0;

  const renderNavButtons = () => {
    // Шаг 3 (Тест): пустое поле → "Пропустить", заполненное → "Далее"
    if (currentStep === 3) {
      if (showSkipForTest) {
        return (
          <Button variant="outline" onClick={handleSkip}>
            Пропустить
          </Button>
        );
      }
      return (
        <Button onClick={handleNext}>
          Далее
        </Button>
      );
    }

    // Шаг 4 (Документы): нет документов → "Пропустить и создать", есть → "Создать когорту"
    if (currentStep === 4) {
      if (showSkipForDocs) {
        return (
          <Button
            onClick={handleCreate}
            className="bg-green-600 hover:bg-green-700"
          >
            Пропустить и создать когорту
          </Button>
        );
      }
      return (
        <Button
          onClick={handleCreate}
          className="bg-green-600 hover:bg-green-700"
        >
          Создать когорту
        </Button>
      );
    }

    // Остальные шаги: "Далее"
    return (
      <Button onClick={handleNext} disabled={!canProceed}>
        Далее
      </Button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto transition-all duration-300 ${hintsOpen ? "max-w-[1100px]" : "max-w-3xl"}`}>
        <DialogHeader>
          <DialogTitle>Создание когорты</DialogTitle>
        </DialogHeader>

        {/* Оверлей создания/успеха/ошибки */}
        {createdState !== "idle" && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg cursor-pointer"
            onClick={() => {
              if (createdState === "error") {
                setCreatedState("idle");
                setCreatedError("");
              }
            }}
          >
            {createdState === "creating" && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-lg font-medium">Создание когорты...</p>
              </div>
            )}
            {createdState === "success" && (
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in duration-300">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-lg font-medium text-green-600">Когорта создана!</p>
              </div>
            )}
            {createdState === "error" && (
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center animate-in zoom-in duration-300">
                  <X className="h-8 w-8 text-red-600" />
                </div>
                <p className="text-lg font-medium text-red-600">Ошибка</p>
                <p className="text-sm text-muted-foreground">{createdError}</p>
                <p className="text-xs text-muted-foreground">Нажмите, чтобы закрыть</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* Индикатор шагов */}
          <StepIndicator
            currentStep={currentStep}
            completedSteps={completedSteps}
            skippedSteps={skippedSteps}
            steps={STEPS}
            onStepClick={handleStepClick}
          />

          {/* Содержимое шага */}
          <div className="min-h-[300px]">
            {currentStep === 0 && (
              <StepBasicInfo
                data={basicInfo}
                onChange={setBasicInfo}
                onValidChange={setStep0Valid}
              />
            )}
            {currentStep === 1 && (
              <StepRoles roles={roles} onChange={handleRolesChange} />
            )}
            {currentStep === 2 && (
              <StepSurvey
                fields={surveyFields ?? getInitialSurveyFields(null, roles)}
                roles={roles}
                onChange={setSurveyFields}
              />
            )}
            {currentStep === 3 && (
              <StepTestTask
                roles={roles}
                testTasks={testTasksByRole}
                onChange={setTestTasksByRole}
              />
            )}
            {currentStep === 4 && (
              <StepDocuments
                documents={documents}
                onChange={setDocuments}
                hintsOpen={hintsOpen}
                onToggleHints={() => setHintsOpen(!hintsOpen)}
              />
            )}
          </div>

          {/* Ошибка */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Навигация */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              <Button variant="ghost" onClick={onClose} disabled={createdState !== "idle"}>
                Отмена
              </Button>
            </div>
            <div className="flex gap-2">
              {currentStep > 0 && createdState === "idle" && (
                <Button variant="outline" onClick={handleBack}>
                  Назад
                </Button>
              )}
              {createdState === "idle" && renderNavButtons()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
