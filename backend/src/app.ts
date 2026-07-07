import express from "express";
import authRouter from "./routes/auth.routes.js";
import cohortRouter from "./routes/cohort.routes.js";
import applicationRouter from "./routes/application.routes.js";
import profileRouter from "./routes/profile.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

export function createApp() {
  const app = express()

  app.use(express.json());

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