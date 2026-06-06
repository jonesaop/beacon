import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
        // Route the Tailwind CSS bundle to popup/popup.css so popup.html can
        // reference it with a stable path (no hash).
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) return "popup/popup.css";
          return "assets/[name]-[hash][extname]";
        },
        format: "es",
      },
    },
  },
});
