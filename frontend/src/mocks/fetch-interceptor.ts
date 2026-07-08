import { apiClient } from "@/shared/api/client";
import {
  mockCohort,
  mockCohorts,
  mockSurveyFields,
  mockTestTask,
  mockUserTestTask,
  mockApplications,
  mockStudentDocument,
  mockTaskCards,
  mockCohortParticipants,
  mockCohortRoles,
  mockAdminApplications,
  mockAdminDocuments,
  mockStudentProfiles,
  mockUsers,
} from "./fixtures";
import { Cohort, SurveyField, CohortRole, AdminApplication, AdminDocumentData } from "@/shared/api/types";

// Копии моков для мутаций
let cohorts = [...mockCohorts];
let cohortRoles = [...mockCohortRoles];
let adminApplications = [...mockAdminApplications];
let adminDocuments = [...mockAdminDocuments];
let surveyFields = [...mockSurveyFields];

// Паттерны маршрутов: метод + regex + обработчик
const routePatterns: Array<{
  method: string;
  pattern: RegExp;
  handler: (match: RegExpMatchArray, request: Request) => Response | Promise<Response>;
}> = [
  // ===== Auth =====
  {
    method: "POST",
    pattern: /^\/api\/auth\/login$/,
    handler: async (_match, request) => {
      const body = (await request.json()) as { email: string; password: string };
      if (body.email === "student@example.com") {
        return Response.json({
          token: "mock-jwt-token-student",
          user: { id: "user-1", email: "student@example.com", fio: "Иванов Иван Иванович", role: "student" as const, createdAt: "2024-01-01" },
        });
      }
      if (body.email === "admin@example.com") {
        return Response.json({
          token: "mock-jwt-token-admin",
          user: { id: "admin-1", email: "admin@example.com", fio: "Петров Пётр Петрович", role: "admin" as const, createdAt: "2024-01-01" },
        });
      }
      return new Response(JSON.stringify({ message: "Неверный email или пароль" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/auth\/register$/,
    handler: async (_match, request) => {
      const body = (await request.json()) as { email: string; password: string };
      return Response.json({
        token: "mock-jwt-token-new",
        user: { id: "new-user", email: body.email, fio: "", role: "student" as const, createdAt: new Date().toISOString() },
      });
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/auth\/me$/,
    handler: (_match, request) => {
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.replace("Bearer ", "");

      if (token === "mock-jwt-token-admin") {
        return Response.json({ id: "admin-1", email: "admin@example.com", fio: "Петров Пётр Петрович", role: "admin" as const, createdAt: "2024-01-01" });
      }
      // По умолчанию — студент
      return Response.json({ id: "user-1", email: "student@example.com", fio: "Иванов Иван Иванович", role: "student" as const, createdAt: "2024-01-01" });
    },
  },

  // ===== Cohorts CRUD =====
  {
    method: "POST",
    pattern: /^\/api\/cohorts$/,
    handler: async (_match, request) => {
      const body = (await request.json()) as Omit<Cohort, 'id'>;
      const newCohort: Cohort = { ...body, id: "cohort-" + Date.now() };
      cohorts.push(newCohort);
      return Response.json(newCohort);
    },
  },
  {
    method: "PUT",
    pattern: /^\/api\/cohorts\/([^/]+)$/,
    handler: async (match, request) => {
      const id = match[1];
      const body = (await request.json()) as Partial<Cohort>;
      const index = cohorts.findIndex((c) => c.id === id);
      if (index !== -1) {
        cohorts[index] = { ...cohorts[index], ...body };
        return Response.json(cohorts[index]);
      }
      return new Response(JSON.stringify({ message: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    },
  },
  {
    method: "DELETE",
    pattern: /^\/api\/cohorts\/([^/]+)$/,
    handler: (match) => {
      const id = match[1];
      const index = cohorts.findIndex((c) => c.id === id);
      if (index !== -1) {
        cohorts.splice(index, 1);
        return Response.json({ success: true });
      }
      return new Response(JSON.stringify({ message: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    },
  },

  // ===== Cohort Survey Fields =====
  {
    method: "POST",
    pattern: /^\/api\/cohorts\/([^/]+)\/survey-fields$/,
    handler: async (match, request) => {
      const cohortId = match[1];
      const body = (await request.json()) as { fields: Omit<SurveyField, 'id'>[] };
      surveyFields = body.fields.map((f, i) => ({ ...f, id: `${cohortId}-field-${i}`, cohortId }));
      return Response.json(surveyFields);
    },
  },

  // ===== Cohort Roles =====
  {
    method: "GET",
    pattern: /^\/api\/cohorts\/([^/]+)\/roles$/,
    handler: (match) => {
      const cohortId = match[1];
      const roles = cohortRoles.filter((r) => r.cohortId === cohortId);
      return Response.json(roles);
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/cohorts\/([^/]+)\/roles$/,
    handler: async (match, request) => {
      const cohortId = match[1];
      const body = (await request.json()) as { roles: { name: string }[] };
      // Удаляем старые роли когорты
      cohortRoles = cohortRoles.filter((r) => r.cohortId !== cohortId);
      // Добавляем новые
      const newRoles: CohortRole[] = body.roles.map((r, i) => ({
        id: `role-${cohortId}-${i}`,
        cohortId,
        name: r.name,
      }));
      cohortRoles.push(...newRoles);
      return Response.json(newRoles);
    },
  },

  // ===== Cohort Test Task =====
  {
    method: "GET",
    pattern: /^\/api\/cohorts\/([^/]+)\/test-task$/,
    handler: (match) => {
      const cohortId = match[1];
      const task = mockTestTask.cohortId === cohortId ? mockTestTask : null;
      if (task) return Response.json(task);
      return new Response(JSON.stringify({ message: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/cohorts\/([^/]+)\/test-task$/,
    handler: async (match, request) => {
      const cohortId = match[1];
      const body = (await request.json()) as { question: string };
      return Response.json({
        id: "test-task-" + cohortId,
        cohortId,
        question: body.question,
        publishedAt: new Date().toISOString(),
      });
    },
  },

  // ===== Admin Applications =====
  {
    method: "GET",
    pattern: /^\/api\/admin\/applications/,
    handler: (_match, request) => {
      const url = new URL(request.url);
      const cohortIdsParam = url.searchParams.get("cohortIds");
      let filtered = adminApplications;
      if (cohortIdsParam) {
        const cohortIds = cohortIdsParam.split(",");
        filtered = filtered.filter((a) => cohortIds.includes(a.cohortId));
      }
      return Response.json(filtered);
    },
  },
  {
    method: "PUT",
    pattern: /^\/api\/admin\/applications\/([^/]+)\/approve$/,
    handler: async (match, request) => {
      const id = match[1];
      const body = (await request.json()) as { roleId: string };
      const index = adminApplications.findIndex((a) => a.id === id);
      if (index !== -1) {
        const role = cohortRoles.find((r) => r.id === body.roleId);
        adminApplications[index] = {
          ...adminApplications[index],
          status: "approved",
          roleName: role?.name,
        };
        return Response.json(adminApplications[index]);
      }
      return new Response(JSON.stringify({ message: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    },
  },
  {
    method: "PUT",
    pattern: /^\/api\/admin\/applications\/([^/]+)\/reject$/,
    handler: async (match, request) => {
      const id = match[1];
      const body = (await request.json()) as { comment: string };
      const index = adminApplications.findIndex((a) => a.id === id);
      if (index !== -1) {
        adminApplications[index] = {
          ...adminApplications[index],
          status: "rejected",
          reviewComment: body.comment,
        };
        return Response.json(adminApplications[index]);
      }
      return new Response(JSON.stringify({ message: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    },
  },
  {
    method: "PATCH",
    pattern: /^\/api\/admin\/applications\/([^/]+)\/role$/,
    handler: async (match, request) => {
      const id = match[1];
      const body = (await request.json()) as { roleId: string };
      const index = adminApplications.findIndex((a) => a.id === id);
      if (index !== -1) {
        const role = cohortRoles.find((r) => r.id === body.roleId);
        adminApplications[index] = {
          ...adminApplications[index],
          roleName: role?.name,
        };
        return Response.json(adminApplications[index]);
      }
      return new Response(JSON.stringify({ message: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    },
  },

  // ===== Admin Documents =====
  {
    method: "GET",
    pattern: /^\/api\/admin\/documents/,
    handler: (_match, request) => {
      const url = new URL(request.url);
      const cohortIdsParam = url.searchParams.get("cohortIds");
      let filtered = adminDocuments;
      if (cohortIdsParam) {
        const cohortIds = cohortIdsParam.split(",");
        filtered = filtered.filter((d) => cohortIds.includes(d.cohortId));
      }
      return Response.json(filtered);
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/admin\/student-document\/review$/,
    handler: async (_match, request) => {
      const body = (await request.json()) as { documentId: string } & Record<string, unknown>;
      const { documentId, ...reviewData } = body;
      const index = adminDocuments.findIndex((d) => d.id === documentId);
      if (index !== -1) {
        adminDocuments[index] = { ...adminDocuments[index], ...reviewData };
        return Response.json(adminDocuments[index]);
      }
      return new Response(JSON.stringify({ message: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    },
  },

  // ===== Student Profile =====
  {
    method: "GET",
    pattern: /^\/api\/admin\/users\/([^/]+)\/profile$/,
    handler: (match) => {
      const userId = match[1];
      const profile = mockStudentProfiles[userId];
      if (profile) {
        return Response.json(profile);
      }
      return new Response(JSON.stringify({ message: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/admin\/users$/,
    handler: () => Response.json(mockUsers),
  },

  // ===== Existing handlers =====
  {
    method: "GET",
    pattern: /^\/api\/cohorts$/,
    handler: () => Response.json(cohorts),
  },
  {
    method: "GET",
    pattern: /^\/api\/cohorts\/([^/]+)$/,
    handler: (match) => {
      const cohortId = match[1];
      const cohort = cohorts.find((c) => c.id === cohortId);
      if (cohort) return Response.json(cohort);
      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/survey\/fields$/,
    handler: () => Response.json(surveyFields),
  },
  {
    method: "POST",
    pattern: /^\/api\/applications$/,
    handler: () =>
      Response.json({ id: "app-" + Date.now(), status: "pending", createdAt: new Date().toISOString() }),
  },
  {
    method: "GET",
    pattern: /^\/api\/test-task\/my/,
    handler: (_match, request) => {
      const url = new URL(request.url);
      const cohortId = url.searchParams.get("cohortId");
      if (cohortId === "test-cohort-id") return Response.json(mockUserTestTask);
      return Response.json({ status: "not_submitted", answer: "" });
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/test-task/,
    handler: (_match, request) => {
      const url = new URL(request.url);
      const cohortId = url.searchParams.get("cohortId");
      if (cohortId === "test-cohort-id") return Response.json(mockTestTask);
      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/test-task\/submit$/,
    handler: () => Response.json({ status: "pending" }),
  },
  {
    method: "GET",
    pattern: /^\/api\/applications\/my$/,
    handler: () => Response.json(mockApplications),
  },
  {
    method: "GET",
    pattern: /^\/api\/cohort-participants/,
    handler: (_match, request) => {
      const url = new URL(request.url);
      const cohortId = url.searchParams.get("cohortId");
      if (cohortId === "test-cohort-id") return Response.json(mockCohortParticipants);
      return Response.json([]);
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/student-document/,
    handler: (_match, request) => {
      const url = new URL(request.url);
      const cohortId = url.searchParams.get("cohortId");
      if (cohortId === "test-cohort-id") return Response.json(mockStudentDocument);
      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    },
  },
  {
    method: "PUT",
    pattern: /^\/api\/student-document$/,
    handler: async (_match, request) => {
      const body = await request.json() as Record<string, unknown>;
      return Response.json({ ...mockStudentDocument, ...body });
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/task-cards$/,
    handler: (_match, request) => {
      const url = new URL(request.url);
      const cohortId = url.searchParams.get("cohortId");
      const week = url.searchParams.get("week");
      if (cohortId === "test-cohort-id") {
        if (week) {
          const weekStart = new Date(week);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return Response.json(
            mockTaskCards.filter((c) => {
              const d = new Date(c.date);
              return d >= weekStart && d < weekEnd;
            })
          );
        }
        return Response.json(mockTaskCards);
      }
      return Response.json([]);
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/task-cards$/,
    handler: async (_match, request) => {
      const body = await request.json() as { cohortId: string; date: string; title: string; description: string; artifact_link?: string };
      return Response.json({
        id: "task-" + Date.now(),
        userId: "user-1",
        ...body,
        artifact_link: body.artifact_link || "",
        updated_at: new Date().toISOString(),
      });
    },
  },
  {
    method: "PUT",
    pattern: /^\/api\/task-cards\/([^/]+)$/,
    handler: async (match, request) => {
      const id = match[1];
      const body = await request.json() as Record<string, unknown>;
      const existing = mockTaskCards.find((c) => c.id === id);
      if (existing) {
        return Response.json({ ...existing, ...body, updated_at: new Date().toISOString() });
      }
      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    },
  },
];

// Оригинальный fetch
const originalFetch = globalThis.fetch.bind(globalThis);

// Mock-fetch функция для apiClient
async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method || "GET").toUpperCase();

  if (url.startsWith("/api/")) {
    const pathname = new URL(url, window.location.origin).pathname;

    for (const route of routePatterns) {
      if (route.method === method) {
        const match = pathname.match(route.pattern);
        if (match) {
          console.log(`[MSW Mock] ${method} ${url}`);
          try {
            const request = new Request(url, init);
            return await route.handler(match, request);
          } catch (err) {
            console.error(`[MSW Mock] Error: ${method} ${url}:`, err);
            return new Response(JSON.stringify({ message: "Mock error" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    console.log(`[MSW Mock] Bypass ${method} ${url}`);
  }

  return originalFetch(input, init);
}

let active = false;

export function enableMocking() {
  if (active) return;
  apiClient.setFetchFn(mockFetch);
  active = true;
  console.log("[MSW Mock] Mock API подключён к apiClient");
}

export function disableMocking() {
  if (!active) return;
  apiClient.resetFetchFn();
  active = false;
  console.log("[MSW Mock] Mock API отключён");
}
