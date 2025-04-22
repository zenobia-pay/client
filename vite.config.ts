import { defineConfig } from "vite";
export default defineConfig({
  build: {
    lib: {
      entry: "./src/index.ts",
      name: "ZenobiaUI",
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [],
    },
  },
});
