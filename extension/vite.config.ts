import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react()],
    define: {
      __API_BASE_URL__: JSON.stringify(env.API_BASE_URL || "http://localhost:3000"),
      __BEACON_API_KEY__: JSON.stringify(env.BEACON_API_KEY || ""),
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          content:    "src/content/content.ts",
          background: "src/background/background.ts",
          popup:      "src/popup/popup.tsx",
        },
        output: {
          entryFileNames: "[name]/[name].js",
          assetFileNames: (assetInfo) => {
            const name = assetInfo.names?.[0];
            if (name?.endsWith(".css")) return "popup/popup.css";
            return "assets/[name]-[hash][extname]";
          },
          format: "es",
        },
      },
    },
  };
});
