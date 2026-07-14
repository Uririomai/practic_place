"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StudentStats } from "./StudentStats";
import { StudentSurveyTab } from "./StudentSurveyTab";
import { StudentTestTab } from "./StudentTestTab";
import { StudentDocumentsTab } from "./StudentDocumentsTab";
import { StudentTasksTab } from "./StudentTasksTab";
import { StudentDataTab } from "./StudentDataTab";
import { api } from "@/shared/api/client";
import { StudentProfile as StudentProfileType } from "@/shared/api/types";
import { ArrowLeft, Mail, Users } from "lucide-react";
import Link from "next/link";

interface StudentProfileProps {
  userId: string;
}

export function StudentProfile({ userId }: StudentProfileProps) {
  const searchParams = useSearchParams();
  const fromPage = searchParams.get("from");
  const [profile, setProfile] = useState<StudentProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("survey");

  const backHref = fromPage === "tasks" ? "/admin/tasks" : "/admin/users";
  const backLabel = fromPage === "tasks" ? "Назад к задачам" : "Назад к пользователям";

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const [data, cohorts] = await Promise.all([
          api.admin.getUserProfile(userId),
          api.cohorts.list().catch(() => []),
        ]);
        // Загружаем роли для когорт заявок
        const uniqueCohortIds = [...new Set(data.applications.map(a => a.cohortId))];
        const rolesMap: Record<string, { id: string; name: string }[]> = {};
        await Promise.all(
          uniqueCohortIds.map(async (cid) => {
            try {
              const roles = await api.admin.getRoles(cid);
              rolesMap[cid] = roles;
            } catch {
              rolesMap[cid] = [];
            }
          })
        );
        // Загружаем каждую заявку через GET /applications/:id (ответы внутри)
        const cohortMap = new Map(cohorts.map(c => [c.id, c]));
        const applications = await Promise.all(
          data.applications.map(async (app) => {
            const roles = rolesMap[app.cohortId] || [];
            const role = app.role || roles.find(r => r.id === app.roleId) || null;
            const cohort = cohortMap.get(app.cohortId) || app.cohort;
            let surveyData: Record<string, string> = {};
            try {
              const detailed = await api.admin.getApplication(app.id);
              if (Array.isArray(detailed.answers)) {
                for (const a of detailed.answers) {
                  surveyData[a.fieldId] = a.value;
                }
              }
              return {
                ...app,
                ...detailed,
                surveyData,
                role,
                cohort,
              };
            } catch {
              return {
                ...app,
                surveyData,
                role,
                cohort,
              };
            }
          })
        );
        const documents = data.documents.map(doc => ({
          ...doc,
          cohort: doc.cohort || cohorts.find(c => c.id === doc.cohortId) || { id: doc.cohortId, name: "—" },
        }));
        setProfile({ ...data, applications, documents });
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Студент не найден</p>
        <Link href="/admin/users">
          <Button variant="link" className="mt-2">Вернуться к списку</Button>
        </Link>
      </div>
    );
  }

  // Фильтрация данных по когорте
  const filteredApps = selectedCohortId === "all"
    ? profile.applications
    : profile.applications.filter(a => a.cohortId === selectedCohortId);
  const filteredDocs = selectedCohortId === "all"
    ? profile.documents
    : profile.documents.filter(d => d.cohort?.id === selectedCohortId);
  const filteredTasks = selectedCohortId === "all"
    ? profile.tasks
    : profile.tasks.filter(t => t.cohortId === selectedCohortId);

  // Группировка задач по когортам
  const tasksByCohort = profile.tasks.reduce((acc, task) => {
    const cohortId = task.cohortId || "unknown";
    if (!acc[cohortId]) acc[cohortId] = [];
    acc[cohortId].push(task);
    return acc;
  }, {} as Record<string, typeof profile.tasks>);

  return (
    <div className="space-y-6">
      {/* Кнопка "Назад" */}
      <Link href={backHref} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" />
        {backLabel}
      </Link>

      {/* Шапка профиля */}
      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-medium text-primary">
          {(profile.user.profile?.student_fio || profile.user.fio || profile.user.email).split(" ").map(n => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile.user.profile?.student_fio || profile.user.fio || profile.user.email}</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              {profile.user.email}
            </span>
            {profile.user.profile?.group && (
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Группа: {profile.user.profile.group}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Статистика */}
      <StudentStats
        tasks={filteredTasks}
        allTasksCount={profile.tasks.length}
        documents={filteredDocs}
        cohorts={profile.cohorts}
      />

      {/* Фильтр по когорте */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Когорта:</span>
        <select
          value={selectedCohortId}
          onChange={(e) => setSelectedCohortId(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Все когорты</option>
          {profile.cohorts.map((cohort) => (
            <option key={cohort.id} value={cohort.id}>
              {cohort.name}
            </option>
          ))}
        </select>
      </div>

      {/* Вкладки */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b">
          <TabsTrigger
            value="survey"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            Анкета
          </TabsTrigger>
          <TabsTrigger
            value="test"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            Тест
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            Документы
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            Задачи
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            Данные
          </TabsTrigger>
        </TabsList>

        <TabsContent value="survey" className="mt-4">
          <StudentSurveyTab applications={filteredApps} />
        </TabsContent>
        <TabsContent value="test" className="mt-4">
          <StudentTestTab applications={filteredApps} />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <StudentDocumentsTab documents={filteredDocs} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <StudentTasksTab
            tasksByCohort={tasksByCohort}
            selectedCohortId={selectedCohortId}
          />
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <StudentDataTab profile={profile.user.profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
