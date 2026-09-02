import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const raw = sp.from;
  const from = typeof raw === "string" ? raw : "/";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">
          Guitare
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Théorie musicale &amp; pratique
        </p>
      </div>
      <LoginForm from={from} />
    </main>
  );
}
