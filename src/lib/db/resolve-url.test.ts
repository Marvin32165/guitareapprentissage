import { describe, it, expect } from "vitest";
import { resolveDatabaseUrl } from "./resolve-url";

describe("choix de la base de données", () => {
  it("Turso est prioritaire sur tout le reste", () => {
    expect(
      resolveDatabaseUrl({
        TURSO_DATABASE_URL: "libsql://x.turso.io",
        DATABASE_URL: "file:./prisma/dev.db",
        VERCEL: "1",
      }),
    ).toBe("libsql://x.turso.io");
  });

  it("en local, la base SQLite est utilisée (dev comme build de prod)", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "file:./prisma/dev.db" })).toBe(
      "file:./prisma/dev.db",
    );
  });

  it("sur Vercel, une base SQLite locale est IGNORÉE (elle serait éphémère)", () => {
    expect(
      resolveDatabaseUrl({ DATABASE_URL: "file:./prisma/dev.db", VERCEL: "1" }),
    ).toBeUndefined();
  });

  it("sur Lambda aussi", () => {
    expect(
      resolveDatabaseUrl({
        DATABASE_URL: "file:./x.db",
        AWS_LAMBDA_FUNCTION_NAME: "fn",
      }),
    ).toBeUndefined();
  });

  it("sur Vercel, une URL distante passée via DATABASE_URL reste valable", () => {
    expect(
      resolveDatabaseUrl({ DATABASE_URL: "libsql://y.turso.io", VERCEL: "1" }),
    ).toBe("libsql://y.turso.io");
  });

  it("rien de configuré : aucune base", () => {
    expect(resolveDatabaseUrl({ VERCEL: "1" })).toBeUndefined();
  });
});
