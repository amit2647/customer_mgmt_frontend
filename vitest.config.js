import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Component tests only; the dev server itself runs without a config file.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
  },
});
