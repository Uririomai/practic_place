import "dotenv/config";
import express from "express";
import authRouter from "./routes/auth.js";

const app = express();
app.use(express.json());

app.use("/auth", authRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`listening on :${port}`);
});

