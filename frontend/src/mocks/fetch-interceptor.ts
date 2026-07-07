import { apiClient } from "@/shared/api/client";
import {
  mockCohort,
  mockSurveyFields,
  mockTestTask,
  mockUserTestTask,
  mockApplications,
  mockStudentDocument,
  mockTaskCards,
} from "./fixtures";

// Паттерны маршрутов: метод + regex + обработчик
const routePatterns: Array<{
  method: string;
  pattern: RegExp;
  handler: (match: RegExpMatchArray, request: Request) => Response | Promise<Response>;
}> = [
  {
    method: "POST",
    pattern: /^\/api\/auth\/login$/,
    handler: async (_match, request) => {
      const body = (await request.json()) as { email: string; password: string };
      if (body.email === "student@example.com") {
        return Response.json({
          token: "mock-jwt-token-student",
          user: { id: "user-1", email: "student@example.com", createdAt: "2024-01-01" },
        });
      }
      if (body.email === "admin@example.com") {
        return Response.json({
          token: "mock-jwt-token-admin",
          user: { id: "admin-1", email: "admin@example.com", createdAt: "2024-01-01" },
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
        user: { id: "new-user", email: body.email, createdAt: new Date().toISOString() },
      });
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/auth\/me$/,
    handler: () =>
      Response.json({ id: "user-1", email: "student@example.com", createdAt: "2024-01-01" }),
  },
  {
    method: "GET",
    pattern: /^\/api\/cohorts\/([^/]+)$/,
    handler: (match) => {
      const cohortId = match[1];
      if (cohortId === "test-cohort-id") return Response.json(mockCohort);
      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/survey\/fields$/,
    handler: () => Response.json(mockSurveyFields),
  },
  {
    method: "POST",
    pattern: /^\/api\/applications$/,
    handler: () =>
      Response.json({ id: "app-1", status: "pending", createdAt: new Date().toISOString() }),
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
