import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Audits hors suite : ils dépendent de ffmpeg (absent en CI) et durent
// plusieurs minutes. À lancer à la main via `npm run audit:pitch`.

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["scripts/**/*.audit.ts"],
    testTimeout: 600_000,
  },
});
