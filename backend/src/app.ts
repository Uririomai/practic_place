import express from "express";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import authRouter from "./routes/auth.routes.js";
import cohortRouter from "./routes/cohort.routes.js";
import applicationRouter from "./routes/application.routes.js";
import profileRouter from "./routes/profile.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

// ponytail: static JSON, no swagger-jsdoc annotations in code
const __dirname = dirname(fileURLToPath(import.meta.url));
const swaggerDoc = JSON.parse(readFileSync(resolve(__dirname, "..", "swagger.json"), "utf-8"));

export function createApp() {
  const app = express()

  app.use(express.json());

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

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