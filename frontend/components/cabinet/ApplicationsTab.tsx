"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  Calendar,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";
import { api } from "@/shared/api/client";
import { Cohort, ApplicationWithTest, SurveyField, TestTask } from "@/shared/api/types";

import { SurveyForm } from "@/components/applications/SurveyForm";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

/** Нормализация статуса: UPPERCASE с бэка → lowercase */
function normalizeStatus(status: string): string {
  return status?.toLowerCase() || "not_submitted";
}

/** Бейдж статуса анкеты */
function surveyStatusBadge(status: string, roleId?: string) {
  const s = status?.toLowerCase();
  if (s === "rejected") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Анкета отклонена
      </Badge>
    );
  }
  // Роль назначена = анкета одобрена
  if (roleId) {
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
        <CheckCircle className="h-3 w-3" />
        Анкета одобрена
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-yellow-300 text-yellow-700 gap-1">
      <Clock className="h-3 w-3" />
      Анкета на проверке
    </Badge>
  );
}

/** Бейдж статуса тестового задания */
function testStatusBadge(hasTest: boolean, testAnswer?: string, status?: string) {
  // Если теста нет — тест не добавлен
  if (!hasTest) {
    return (
      <Badge variant="outline" className="text-muted-foreground gap-1">
        <FileText className="h-3 w-3" />
        Тест не добавлен
      </Badge>
    );
  }
  const s = status?.toLowerCase();
  if (s === "approved") {
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
        <CheckCircle className="h-3 w-3" />
        Тест одобрен
      </Badge>
    );
  }
  if (s === "rejected") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Тест отклонён
      </Badge>
    );
  }
  // Если есть ответ — ожидает проверки
  if (testAnswer) {
    return (
      <Badge variant="outline" className="border-yellow-300 text-yellow-700 gap-1">
        <Clock className="h-3 w-3" />
        Ожидает проверки
      </Badge>
    );
  }
  // Тест есть, ответа нет
  return (
    <Badge variant="outline" className="border-blue-300 text-blue-700 gap-1">
      <Clock className="h-3 w-3" />
      Ожидает прохождения
    </Badge>
  );
}

export function ApplicationsTab() {
  const router = useRouter();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [applications, setApplications] = useState<ApplicationWithTest[]>([]);
  const [fields, setFields] = useState<SurveyField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Модалка анкеты
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);

  // Модалка деталей заявки
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ApplicationWithTest | null>(null);
  const [appAnswers, setAppAnswers] = useState<{ fieldId: string; value: string }[]>([]);
  const [detailFields, setDetailFields] = useState<SurveyField[]>([]);
  const [answersLoading, setAnswersLoading] = useState(false);

  // Тестовые задания для когорты (cohortId → TestTask[])
  const [cohortTestTasks, setCohortTestTasks] = useState<Record<string, TestTask[]>>({});

  useEffect(() => {
    Promise.all([
      api.cohorts.active().catch(() => []),
      api.applications.getMy().catch(() => []),
    ])
      .then(([cohortsRes, appsRes]) => {
        setCohorts(cohortsRes);
        setApplications(appsRes);
        // Загружаем наличие тестов для каждой когорты через GET /cohorts/:id/test-tasks
        const cohortIds = [...new Set(appsRes.map((a: ApplicationWithTest) => a.cohortId))];
        if (cohortIds.length > 0) {
          Promise.all(
            cohortIds.map((id) =>
              api.testTask.get(id)
                .then((tasks) => ({ id, tasks }))
                .catch((err) => {
                  // 403 = тест есть, но нет доступа (считаем что есть)
                  // 404/другое = теста нет
                  const isForbidden = err && typeof err?.status === "number" && err.status === 403;
                  return { id, tasks: isForbidden ? [] : [] };
                })
            )
          ).then((results) => {
            const map: Record<string, TestTask[]> = {};
            results.forEach((r) => { map[r.id] = r.tasks; });
            setCohortTestTasks(map);
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Когорты, на которые ещё нет заявки
  const availableCohorts = useMemo(() => {
    const appliedCohortIds = new Set(applications.map((a) => a.cohortId));
    return cohorts.filter((c) => !appliedCohortIds.has(c.id));
  }, [cohorts, applications]);

  // Открыть модалку анкеты
  const openSurveyModal = async (cohort: Cohort) => {
    setSelectedCohort(cohort);
    setSurveyModalOpen(true);
    setFields([]);
    setFieldsLoading(true);
    // Загружаем поля анкеты для выбранной когорты
    try {
      const fieldsRes = await api.survey.getFields(cohort.id);
      console.log("Поля анкеты загружены:", fieldsRes);
      setFields(fieldsRes);
    } catch (e) {
      console.error("Ошибка загрузки полей анкеты:", e);
      setFields([]);
    } finally {
      setFieldsLoading(false);
    }
  };

  // После отправки анкеты — обновить список заявок
  const handleSurveySubmitted = () => {
    setSurveyModalOpen(false);
    setSelectedCohort(null);
    // Перезагружаем заявки
    api.applications.getMy().then(setApplications).catch(() => {});
  };

  // Открыть тест
  const openTest = (applicationId: string) => {
    router.push(`/cabinet/test?applicationId=${applicationId}`);
  };

  // Открыть модалку деталей заявки
  const openDetailModal = async (app: ApplicationWithTest) => {
    setSelectedApp(app);
    setDetailModalOpen(true);
    setAppAnswers([]);
    setDetailFields([]);
    setAnswersLoading(true);
    try {
      // Загружаем заявку с деталями и ответами через GET /applications/:id
      const data = await api.admin.getApplication(app.id);
      // Обновляем заявку в списке с данными от сервера (testStatus, testAnswer)
      setApplications((prev) =>
        prev.map((a) => (a.id === data.id ? { ...a, ...data } : a))
      );
      // Ответы приходят с полями (field.label, field.id)
      if (data.answers && data.answers.length > 0) {
        setAppAnswers(data.answers);
        // Поля уже встроены в ответ, но для совместимости подгружаем отдельно
        const fields = await api.survey.getFields(app.cohortId).catch(() => []);
        setDetailFields(fields);
      } else {
        setAppAnswers([]);
        const fields = await api.survey.getFields(app.cohortId).catch(() => []);
        setDetailFields(fields);
      }
    } catch {
      setAppAnswers([]);
      setDetailFields([]);
    } finally {
      setAnswersLoading(false);
    }
  };

  // Нормализованные статусы для модалки
  const detailNormalizedStatus = selectedApp ? normalizeStatus(selectedApp.status) : "";
  const detailHasTest = selectedApp
    ? (cohortTestTasks[selectedApp.cohortId] ?? []).some(t => t.roleId === (selectedApp.roleId || selectedApp.role?.id))
    : false;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Заявки</h2>
          <p className="text-muted-foreground">Доступные практики и ваши заявки</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Заявки</h2>
        <p className="text-muted-foreground">Доступные практики и ваши заявки</p>
      </div>

      {/* Доступные практики */}
      {availableCohorts.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Доступные практики
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {availableCohorts.map((cohort) => (
              <Card key={cohort.id} className="transition-colors hover:border-primary/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {cohort.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p>
                      Заявки: {format(parseISO(cohort.applicationStart), "d MMM", { locale: ru })} —{" "}
                      {format(parseISO(cohort.applicationEnd), "d MMM yyyy", { locale: ru })}
                    </p>
                    <p>
                      Практика: {format(parseISO(cohort.practiceStart), "d MMM", { locale: ru })} —{" "}
                      {format(parseISO(cohort.practiceEnd), "d MMM yyyy", { locale: ru })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openSurveyModal(cohort)}
                    className="w-full"
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Подать заявку
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Мои заявки */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Мои заявки
        </h3>
        {applications.length === 0 ? (
          <div className="rounded-lg border bg-muted/50 p-8 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              У вас пока нет заявок. Подайте заявку на доступную практику above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const cohort = cohorts.find((c) => c.id === app.cohortId);
              const normalizedStatus = normalizeStatus(app.status);
              const cohortTasks = cohortTestTasks[app.cohortId] ?? [];
              const hasTestForRole = cohortTasks.some(t => t.roleId === (app.roleId || app.role?.id));
              // Тест доступен если: роль назначена (roleId есть) + тест загружен + ответ ещё не отправлен
              const canOpenTest = !!app.roleId && hasTestForRole && !app.testAnswer;

              return (
                <Card
                  key={app.id}
                  className="cursor-pointer transition-colors hover:border-primary/50"
                  onClick={() => openDetailModal(app)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <p className="font-medium truncate">
                            {cohort?.name || "Практика"}
                          </p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {surveyStatusBadge(app.status, app.roleId)}
                          {app.roleId && testStatusBadge(hasTestForRole, app.testAnswer, app.status)}
                        </div>
                      </div>
                      {canOpenTest && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); openTest(app.id); }}
                          className="shrink-0"
                        >
                          Начать выполнение тестового задания
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Модалка анкеты */}
      <Dialog open={surveyModalOpen} onOpenChange={setSurveyModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Заявка: {selectedCohort?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedCohort && fields.length > 0 ? (
            <SurveyForm
              cohortId={selectedCohort.id}
              fields={fields}
              onSuccess={handleSurveySubmitted}
            />
          ) : selectedCohort ? (
            <div className="py-8 text-center text-muted-foreground">
              {fieldsLoading
                ? "Загрузка полей анкеты..."
                : "Анкета пока не настроена. Обратитесь к администратору."}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Модалка деталей заявки */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Заявка: {selectedApp ? (cohorts.find(c => c.id === selectedApp.cohortId)?.name || "Практика") : ""}
            </DialogTitle>
          </DialogHeader>

          {selectedApp && (
            <div className="overflow-y-auto flex-1 min-h-0 space-y-4">
              {/* Информация */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Дата подачи:</span>{" "}
                  {new Date(selectedApp.createdAt).toLocaleDateString("ru-RU")}
                </div>
                <div>
                  <span className="text-muted-foreground">Статус:</span>{" "}
                  {surveyStatusBadge(selectedApp.status, selectedApp.roleId)}
                </div>
                {(selectedApp.role || selectedApp.roleId) && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Роль:</span>{" "}
                    <Badge variant="secondary">{selectedApp.role?.name || selectedApp.roleId}</Badge>
                  </div>
                )}
              </div>

              {/* Комментарий при отклонении */}
              {selectedApp.reviewComment && (
                <div className="rounded-lg border p-4 text-sm bg-red-50 text-red-700">
                  <span className="font-medium">Причина отклонения:</span> {selectedApp.reviewComment}
                </div>
              )}

              {/* Анкета */}
              <div>
                <h4 className="text-sm font-medium mb-2">Анкета</h4>
                {answersLoading ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загрузка...
                  </div>
                ) : appAnswers.length > 0 ? (
                  <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                    {appAnswers.map((answer) => {
                      // Поддержка: бэкенд возвращает field.label, мок — через detailFields
                      const field = detailFields.find(f => f.id === answer.fieldId);
                      const label = (answer as any).field?.label || field?.label || answer.fieldId;
                      return (
                        <div key={answer.fieldId} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{label}:</span>
                          <span className="text-right max-w-[60%]">{answer.value || "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border p-6 text-center text-muted-foreground text-sm">
                    Ответы анкеты не заполнены
                  </div>
                )}
              </div>

              {/* Тестовое задание — если роль назначена и тест загружен */}
              {selectedApp.roleId && detailHasTest && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Тестовое задание</h4>
                  {!detailHasTest ? (
                    <div className="rounded-lg border p-4 bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        Тестовое задание пока не добавлено администратором.
                      </p>
                    </div>
                  ) : !selectedApp.testAnswer ? (
                    <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Тестовое задание доступно. Вы можете приступить к выполнению.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setDetailModalOpen(false);
                          router.push(`/cabinet/test?applicationId=${selectedApp.id}`);
                        }}
                      >
                        Начать выполнение
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2">
                        {testStatusBadge(true, selectedApp.testAnswer, selectedApp.status)}
                      </div>
                      {selectedApp.testAnswer && (
                        <div className="rounded-lg border p-4 text-sm bg-muted/30 whitespace-pre-wrap">
                          {selectedApp.testAnswer}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
