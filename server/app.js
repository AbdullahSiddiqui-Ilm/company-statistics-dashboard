import express from "express";
import { memoryAuthStore } from "./auth-store.js";
import { authHandlers, sameOrigin, authRateLimit } from "./auth.js";
import { demoRows, departments, summarize } from "./statistics.js";

export function createApp({
  loadRows = async () => demoRows,
  source = "demo",
  authStore = memoryAuthStore(),
  secureCookies = process.env.NODE_ENV === "production",
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.get("/api/health", (_req, res) => res.json({ status: "ok", source }));
  app.use(express.json({ limit: "16kb" }));
  const auth = authHandlers(authStore, { secure: secureCookies });
  const limit = authRateLimit();
  app.get("/api/auth/me", auth.me);
  app.post("/api/auth/signup", sameOrigin, limit, auth.signup);
  app.post("/api/auth/login", sameOrigin, limit, auth.login);
  app.post("/api/auth/logout", sameOrigin, auth.logout);
  app.get("/api/statistics", auth.requireUser, async (req, res) => {
    const months = Number(req.query.months ?? 12);
    const department = req.query.department ?? "all";
    if (
      ![3, 6, 12].includes(months) ||
      (department !== "all" && !departments.includes(department))
    ) {
      return res
        .status(400)
        .json({ error: "Choose 3, 6, or 12 months and a valid department." });
    }
    try {
      const rows = await loadRows();
      res.json({
        ...summarize(rows, months, department),
        source,
        departments,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Statistics query failed:", error.message);
      res.status(503).json({
        error: "Statistics are unavailable. Please try again shortly.",
      });
    }
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ error: error.type === "entity.too.large" ? "Request is too large." : error instanceof SyntaxError ? "Request must contain valid JSON." : "An unexpected error occurred." });
  });
  return app;
}
