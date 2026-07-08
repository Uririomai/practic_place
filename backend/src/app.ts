import express from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import authRouter from "./routes/auth.routes.js";
import cohortRouter from "./routes/cohorts/cohorts.routes.js";
import applicationRouter from "./routes/applications/application.routes.js";
import profileRouter from "./routes/profile.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

// ponytail: swagger-jsdoc reads @openapi JSDoc tags from route files
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Практика API",
      version: "1.0.0",
      description: "API для сервиса управления производственной практикой студентов",
    },
    servers: [{ url: "/", description: "Local dev" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: { error: { type: "string" } },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            role: { type: "string", enum: ["STUDENT", "ADMIN"] },
            activeCohortId: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                id: { type: "string" },
                email: { type: "string" },
              },
            },
            token: { type: "string" },
          },
        },
        Cohort: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            applicationStart: { type: "string", format: "date-time" },
            applicationEnd: { type: "string", format: "date-time" },
            practiceStart: { type: "string", format: "date-time" },
            practiceEnd: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        CohortInput: {
          type: "object",
          required: ["name", "applicationStart", "applicationEnd", "practiceStart", "practiceEnd"],
          properties: {
            name: { type: "string" },
            applicationStart: { type: "string", format: "date-time" },
            applicationEnd: { type: "string", format: "date-time" },
            practiceStart: { type: "string", format: "date-time" },
            practiceEnd: { type: "string", format: "date-time" },
          },
        },
        CohortRole: {
          type: "object",
          properties: {
            id: { type: "string" },
            cohortId: { type: "string" },
            name: { type: "string" },
          },
        },
        Application: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
            cohortId: { type: "string" },
            roleId: { type: "string", nullable: true },
            status: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"] },
            reviewComment: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            user: { $ref: "#/components/schemas/User" },
            cohort: { $ref: "#/components/schemas/Cohort" },
            role: { $ref: "#/components/schemas/CohortRole" },
          },
        },
        SurveyField: {
          type: "object",
          properties: {
            id: { type: "string" },
            cohortId: { type: "string" },
            label: { type: "string" },
            type: { type: "string" },
            options: { type: "object", nullable: true },
            order: { type: "integer" },
          },
        },
        ApplicationAnswer: {
          type: "object",
          properties: {
            id: { type: "string" },
            applicationId: { type: "string" },
            fieldId: { type: "string" },
            value: { type: "string" },
            field: { $ref: "#/components/schemas/SurveyField" },
          },
        },
        PracticeData: {
          type: "object",
          properties: {
            id: { type: "string" },
            applicationId: { type: "string" },
            studentFullName: { type: "string", nullable: true },
            groupName: { type: "string", nullable: true },
            docFields: { type: "object" },
            reportFileUrl: { type: "string", nullable: true },
            isReportApproved: { type: "boolean" },
          },
        },
        TaskCard: {
          type: "object",
          properties: {
            id: { type: "string" },
            applicationId: { type: "string" },
            date: { type: "string", format: "date-time" },
            title: { type: "string" },
            description: { type: "string" },
            artifactLink: { type: "string", nullable: true },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        TestTask: {
          type: "object",
          properties: {
            id: { type: "string" },
            cohortId: { type: "string" },
            content: { type: "string" },
            publishedAt: { type: "string", format: "date-time", nullable: true },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
});

export function createApp() {
  const app = express()

  app.use(express.json());

  if (process.env.SWAGGER_ENABLED)
    app.get("/api-docs.json", (_req, res) => {
      res.json(swaggerSpec);
    });
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use("/auth", authRouter);
  app.use("/cohorts", cohortRouter);
  app.use("/applications", applicationRouter);
  app.use("/me", profileRouter);

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(errorMiddleware);

  return app
}
