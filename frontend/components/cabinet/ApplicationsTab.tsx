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
} from "lucide-react";
import { api } from "@/shared/api/client";
import { Cohort, ApplicationWithTest, SurveyField } from "@/shared/api/types";
import { SurveyForm } from "@/components/applications/SurveyForm";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

/** Бейдж статуса анкеты */
function surveyStatusBadge(status: string) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
          <CheckCircle className="h-3 w-3" />
          Анкета одобрена
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Анкета отклонена
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-yellow-300 text-yellow-700 gap-1">
          <Clock className="h-3 w-3" />
          Анкета на проверке
        </Badge>
      );
  }
}

/** Бейдж статуса тестового задания */
function testStatusBadge(status: string) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
          <CheckCircle className="h-3 w-3" />
          Тест одобрен
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Тест не прошёл
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="border-yellow-300 text-yellow-700 gap-1">
          <Clock className="h-3 w-3" />
          Тест на проверке
        </Badge>
      );
    default:
      return null;
  }
}

export function ApplicationsTab() {
  const router = useRouter();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [applications, setApplications] = useState<ApplicationWithTest[]>([]);
  const [fields, setFields] = useState<SurveyField[]>([]);
  const [loading, setLoading] = useState(true);

  // Модалка анкеты
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);

  useEffect(() => {
    Promise.all([
      api.cohorts.list().catch(() => []),
      api.applications.getMy().catch(() => []),
      api.survey.getFields().catch(() => []),
    ])
      .then(([cohortsRes, appsRes, fieldsRes]) => {
        setCohorts(cohortsRes);
        setApplications(appsRes);
        setFields(fieldsRes);
      })
      .finally(() => setLoading(false));
  }, []);

  // Когорты, на которые ещё нет заявки
  const availableCohorts = useMemo(() => {
    const appliedCohortIds = new Set(applications.map((a) => a.cohortId));
    return cohorts.filter((c) => !appliedCohortIds.has(c.id));
  }, [cohorts, applications]);

  // Открыть модалку анкеты
  const openSurveyModal = (cohort: Cohort) => {
    setSelectedCohort(cohort);
    setSurveyModalOpen(true);
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
              const canOpenTest = app.status === "approved" && (app.testStatus === "not_submitted" || app.testStatus === "rejected");

              return (
                <Card key={app.id}>
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
                          {surveyStatusBadge(app.status)}
                          {app.testStatus !== "not_submitted" && testStatusBadge(app.testStatus)}
                          {app.testStatus === "not_submitted" && app.status === "approved" && (
                            <Badge variant="secondary" className="gap-1">
                              <FileText className="h-3 w-3" />
                              Тест не начат
                            </Badge>
                          )}
                        </div>
                        {app.reviewComment && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Комментарий: {app.reviewComment}
                          </p>
                        )}
                      </div>
                      {canOpenTest && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTest(app.id)}
                          className="shrink-0"
                        >
                          Открыть тест
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
          {selectedCohort && fields.length > 0 && (
            <SurveyForm
              cohortId={selectedCohort.id}
              fields={fields}
              onSuccess={handleSurveySubmitted}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
