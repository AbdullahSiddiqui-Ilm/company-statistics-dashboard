import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = process.env.PORT || env.PORT || "3001";
  return {
    plugins: [react()],
    root: "client",
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${apiPort}`,
          // Preserve the browser-facing Host so the API can validate Origin.
          changeOrigin: false,
        },
      },
    },
    build: { outDir: "../dist", emptyOutDir: true },
  };
});
