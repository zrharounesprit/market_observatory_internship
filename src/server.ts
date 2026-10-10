import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRouter from "./api";
import { startScheduler } from "./jobs/scheduler";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", apiRouter);

app.listen(PORT, () => {
  console.log(`Aura Observatory API running on port ${PORT}`);
  startScheduler();
});
