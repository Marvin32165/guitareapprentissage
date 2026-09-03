import { describe, it, expect } from "vitest";
import { resolveDatabaseUrl } from "./resolve-url";

describe("choix de la base de données", () => {
  it("Turso est prioritaire", () => {
    expect(
      resolveDatabaseUrl({
        TURSO_DATABASE_URL: "libsql://x.turso.io",
        DATABASE_URL: "file:./prisma/dev.db",
        NODE_ENV: "production",
      }),
    ).toBe("libsql://x.turso.io");
  });

  it("en dev, la base SQLite locale est utilisée", () => {
    expect(
      resolveDatabaseUrl({ DATABASE_URL: "file:./prisma/dev.db", NODE_ENV: "development" }),
    ).toBe("file:./prisma/dev.db");
  });

  it("en production, une base SQLite locale est IGNORÉE (elle serait éphémère)", () => {
    expect(
      resolveDatabaseUrl({ DATABASE_URL: "file:./prisma/dev.db", NODE_ENV: "production" }),
    ).toBeUndefined();
  });

  it("sans rien de configuré : aucune base", () => {
    expect(resolveDatabaseUrl({ NODE_ENV: "production" })).toBeUndefined();
  });
});
