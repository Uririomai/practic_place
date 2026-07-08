import { http } from "msw";
import {
  mockCohort,
  mockSurveyFields,
  mockTestTask,
  mockUserTestTask,
  mockApplications,
  mockStudentDocument,
  mockTaskCards,
} from "./fixtures";

export const handlers = [
  // Auth endpoints
  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    const { email } = body;

    if (email === "student@example.com") {
      return Response.json({
        token: "mock-jwt-token-student",
        user: {
          id: "user-1",
          email: "student@example.com",
          createdAt: "2024-01-01",
        },
      });
    }

    if (email === "admin@example.com") {
      return Response.json({
        token: "mock-jwt-token-admin",
        user: {
          id: "admin-1",
          email: "admin@example.com",
          createdAt: "2024-01-01",
        },
      });
    }

    return new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 401 });
  }),

  http.post("/api/auth/register", async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    return Response.json({
      token: "mock-jwt-token-new",
      user: {
        id: "new-user",
        email: body.email,
        createdAt: new Date().toISOString(),
      },
    });
  }),

  http.get("/api/auth/me", () => {
    return Response.json({
      id: "user-1",
      email: "student@example.com",
      createdAt: "2024-01-01",
    });
  }),

  // Cohort endpoints
  http.get("/api/cohorts/:cohortId", ({ params }) => {
    const { cohortId } = params;
    if (cohortId === "test-cohort-id") {
      return Response.json(mockCohort);
    }
    return new Response(JSON.stringify({ message: "Cohort not found" }), { status: 404 });
  }),

  // Survey endpoints
  http.get("/api/survey/fields", () => {
    return Response.json(mockSurveyFields);
  }),

  http.post("/api/applications", () => {
    return Response.json({
      id: "app-1",
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }),

  // Test task endpoints
  http.get("/api/test-task", ({ request }) => {
    const url = new URL(request.url);
    const cohortId = url.searchParams.get("cohortId");

    if (cohortId === "test-cohort-id") {
      return Response.json(mockTestTask);
    }
    return new Response(JSON.stringify({ message: "Test task not found" }), { status: 404 });
  }),

  http.get("/api/test-task/my", ({ request }) => {
    const url = new URL(request.url);
    const cohortId = url.searchParams.get("cohortId");

    if (cohortId === "test-cohort-id") {
      return Response.json(mockUserTestTask);
    }
    return Response.json({
      status: "not_submitted" as const,
      answer: "",
    });
  }),

  http.post("/api/test-task/submit", () => {
    return Response.json({
      status: "pending" as const,
    });
  }),

  // Application endpoints
  http.get("/api/applications/my", () => {
    return Response.json(mockApplications);
  }),

  // Student document endpoints
  http.get("/api/student-document", ({ request }) => {
    const url = new URL(request.url);
    const cohortId = url.searchParams.get("cohortId");
    if (cohortId === "test-cohort-id") {
      return Response.json(mockStudentDocument);
    }
    return Response.json({ message: "Document not found" }, { status: 404 });
  }),

  http.put("/api/student-document", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return Response.json({ ...mockStudentDocument, ...body });
  }),

  // Task card endpoints
  http.get("/api/task-cards", ({ request }) => {
    const url = new URL(request.url);
    const cohortId = url.searchParams.get("cohortId");
    const week = url.searchParams.get("week");
    if (cohortId === "test-cohort-id") {
      // Фильтруем по неделе если указана
      if (week) {
        const weekStart = new Date(week);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const filtered = mockTaskCards.filter((card) => {
          const cardDate = new Date(card.date);
          return cardDate >= weekStart && cardDate < weekEnd;
        });
        return Response.json(filtered);
      }
      return Response.json(mockTaskCards);
    }
    return Response.json([]);
  }),

  http.post("/api/task-cards", async ({ request }) => {
    const body = (await request.json()) as { cohortId: string; date: string; title: string; description: string; artifact_link?: string };
    return Response.json({
      id: "task-" + Date.now(),
      userId: "user-1",
      ...body,
      artifact_link: body.artifact_link || "",
      updated_at: new Date().toISOString(),
    });
  }),

  http.put("/api/task-cards/:id", async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Record<string, unknown>;
    const existing = mockTaskCards.find((c) => c.id === id);
    if (existing) {
      return Response.json({ ...existing, ...body, updated_at: new Date().toISOString() });
    }
    return Response.json({ message: "Not found" }, { status: 404 });
  }),
];