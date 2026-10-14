import "dotenv/config";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createApp } from "./app.js";

const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    })
  : null;
const app = createApp(
  pool
    ? {
        source: "postgresql",
        loadRows: async () =>
          (
            await pool.query(
              "SELECT to_char(month, 'YYYY-MM-DD') AS month, department, revenue, expenses, sales, employees FROM monthly_statistics ORDER BY month, department",
            )
          ).rows,
      }
    : {},
);
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
app.use(express.static(dist));
app.get("/{*path}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
const server = app.listen(
  Number(process.env.PORT || 3001),
  "127.0.0.1",
  (error) => {
    if (error) {
      console.error(
        `API could not start on port ${process.env.PORT || 3001}: ${error.code}. ${error.code === "EADDRINUSE" ? "Another process is using this port. Set PORT=3002 in .env and restart." : error.message}`,
      );
      process.exit(1);
    }
    console.log(
      `API and production app: http://localhost:${process.env.PORT || 3001} (${pool ? "PostgreSQL" : "demo data"})`,
    );
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await pool?.end();
      process.exit(0);
    }),
  );
