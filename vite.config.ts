import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    lib: {
      entry: "./src/index.ts",
      name: "ZenobiaUI",
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["solid-js"],
    },
  },
});
