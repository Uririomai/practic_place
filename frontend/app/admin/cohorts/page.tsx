"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CohortForm } from "@/components/admin/CohortForm";
import { SurveyFieldsEditor } from "@/components/admin/SurveyFieldsEditor";
import { CohortRolesEditor } from "@/components/admin/CohortRolesEditor";
import { TestTaskEditor } from "@/components/admin/TestTaskEditor";
import { DocumentTemplatesEditor } from "@/components/admin/DocumentTemplatesEditor";
import { CohortWizard } from "@/components/admin/CohortWizard";
import { api } from "@/shared/api/client";
import { Cohort, SurveyField, CohortRole } from "@/shared/api/types";
import { Plus, Settings, FileText, Users, BookOpen, FileStack } from "lucide-react";

type EditorMode = "cohort" | "survey" | "roles" | "test" | "documents" | null;

// Дефолтные поля анкеты
const DEFAULT_SURVEY_FIELDS: Omit<SurveyField, 'id'>[] = [
  {
    label: "ФИО",
    type: "text",
    placeholder: "Иванов Иван Иванович",
    required: true,
    order: 1,
  },
  {
    label: "Группа",
    type: "text",
    placeholder: "РИ-330930",
    required: true,
    order: 2,
  },
  {
    label: "Курс",
    type: "select",
    options: ["1", "2", "3", "4"],
    required: true,
    order: 3,
  },
  {
    label: "Желаемая роль",
    type: "text",
    placeholder: "Frontend, Backend, Дизайнер...",
    required: true,
    order: 4,
  },
  {
    label: "Используемые технологии",
    type: "textarea",
    placeholder: "React, Node.js, TypeScript...",
    required: true,
    order: 5,
  },
];

export default function AdminCohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [surveyFields, setSurveyFields] = useState<SurveyField[]>([]);
  const [cohortRoles, setCohortRoles] = useState<CohortRole[]>([]);
  const [docTemplates, setDocTemplates] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const loadCohorts = async () => {
    try {
      const data = await api.cohorts.list();
      setCohorts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCohorts();
  }, []);

  const handleSaveCohort = async (data: Omit<Cohort, 'id'>) => {
    setSaving(true);
    try {
      if (selectedCohort) {
        await api.admin.updateCohort(selectedCohort.id, data);
      } else {
        await api.admin.createCohort(data);
      }
      await loadCohorts();
      setEditorMode(null);
      setSelectedCohort(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCohort = async (id: string) => {
    if (!confirm("Удалить когорту?")) return;
    try {
      await api.admin.deleteCohort(id);
      await loadCohorts();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка удаления";
      alert(`Не удалось удалить когорту: ${message}`);
    }
  };

  const handleOpenSurvey = async (cohort: Cohort) => {
    setSelectedCohort(cohort);
    // Загружаем существующие поля или используем дефолтные
    try {
      const fields = await api.survey.getFields(cohort.id);
      // Фильтруем поля для этой когорты (в моке все поля общие)
      setSurveyFields(fields.length > 0 ? fields : DEFAULT_SURVEY_FIELDS.map((f, i) => ({ ...f, id: `default-${i}` })));
    } catch {
      setSurveyFields(DEFAULT_SURVEY_FIELDS.map((f, i) => ({ ...f, id: `default-${i}` })));
    }
    setEditorMode("survey");
  };

  const handleSaveSurveyFields = async (fields: Omit<SurveyField, 'id'>[]) => {
    if (!selectedCohort) return;
    setSaving(true);
    try {
      await api.admin.saveSurveyFields(selectedCohort.id, { fields });
      setEditorMode(null);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRoles = async (cohort: Cohort) => {
    setSelectedCohort(cohort);
    const roles = await api.admin.getRoles(cohort.id);
    setCohortRoles(roles);
    setEditorMode("roles");
  };

  const handleSaveRoles = async (roles: { name: string }[]) => {
    if (!selectedCohort) return;
    setSaving(true);
    try {
      // Загружаем существующие роли
      const existingRoles = await api.admin.getRoles(selectedCohort.id);
      const newNames = new Set(roles.filter(r => r.name.trim()).map(r => r.name.toLowerCase()));

      // Удаляем роли, которых нет в новом списке
      for (const existing of existingRoles) {
        if (!newNames.has(existing.name.toLowerCase())) {
          await api.admin.deleteRole(selectedCohort.id, existing.id);
        }
      }

      // Создаём новые роли (которых ещё нет)
      const existingNames = new Set(existingRoles.map(r => r.name.toLowerCase()));
      const newRoles = roles.filter(r => r.name.trim() && !existingNames.has(r.name.toLowerCase()));
      if (newRoles.length > 0) {
        await api.admin.saveRoles(selectedCohort.id, { roles: newRoles });
      }
      setEditorMode(null);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenTest = async (cohort: Cohort) => {
    setSelectedCohort(cohort);
    setEditorMode("test");
  };

  const handleOpenDocuments = async (cohort: Cohort) => {
    setSelectedCohort(cohort);
    try {
      const templates = await api.admin.getDocumentTemplates(cohort.id);
      setDocTemplates(templates);
    } catch {
      setDocTemplates([]);
    }
    setEditorMode("documents");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Когорты</h1>
          <p className="text-muted-foreground">
            Управление когортами практики
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Создать когорту
        </Button>
      </div>

      {cohorts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Когорты не созданы</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {cohorts.map((cohort) => (
            <Card key={cohort.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{cohort.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedCohort(cohort); setEditorMode("cohort"); }}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Настройки
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenSurvey(cohort)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Анкета
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenRoles(cohort)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Роли
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenTest(cohort)}
                    >
                      <BookOpen className="h-4 w-4 mr-1" />
                      Тест
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDocuments(cohort)}
                    >
                      <FileStack className="h-4 w-4 mr-1" />
                      Документы
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCohort(cohort.id)}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Приём заявок:</span>{" "}
                    {formatDate(cohort.applicationStart)} — {formatDate(cohort.applicationEnd)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Практика:</span>{" "}
                    {formatDate(cohort.practiceStart)} — {formatDate(cohort.practiceEnd)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Модалки */}
      <Dialog open={editorMode === "cohort"} onOpenChange={() => setEditorMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCohort ? "Редактирование когорты" : "Новая когорта"}
            </DialogTitle>
          </DialogHeader>
          <CohortForm
            cohort={selectedCohort}
            onSave={handleSaveCohort}
            onCancel={() => { setEditorMode(null); setSelectedCohort(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editorMode === "survey"} onOpenChange={() => setEditorMode(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Анкета: {selectedCohort?.name}
            </DialogTitle>
          </DialogHeader>
          <SurveyFieldsEditor
            initialFields={surveyFields}
            onSave={handleSaveSurveyFields}
            onCancel={() => { setEditorMode(null); setSelectedCohort(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editorMode === "roles"} onOpenChange={() => setEditorMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Роли: {selectedCohort?.name}
            </DialogTitle>
          </DialogHeader>
          <CohortRolesEditor
            initialRoles={cohortRoles}
            onSave={handleSaveRoles}
            onCancel={() => { setEditorMode(null); setSelectedCohort(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editorMode === "test"} onOpenChange={() => setEditorMode(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Тестовые задания: {selectedCohort?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedCohort && (
            <TestTaskEditor
              cohortId={selectedCohort.id}
              onSaved={() => { setEditorMode(null); loadCohorts(); }}
              onCancel={() => { setEditorMode(null); setSelectedCohort(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editorMode === "documents"} onOpenChange={() => setEditorMode(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Шаблоны документов: {selectedCohort?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedCohort && (
            <DocumentTemplatesEditor
              cohortId={selectedCohort.id}
              initialTemplates={docTemplates}
              onSaved={() => setEditorMode(null)}
              onCancel={() => { setEditorMode(null); setSelectedCohort(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Мастер создания когорты — компонент всегда смонтирован, state сохраняется */}
      <CohortWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={() => { setWizardOpen(false); loadCohorts(); }}
      />
    </div>
  );
}
