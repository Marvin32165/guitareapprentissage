export function ModuleStub({
  title,
  intro,
  bullets,
  phase,
}: {
  title: string;
  intro: string;
  bullets: string[];
  phase: string;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-neutral-400">{intro}</p>
      </header>
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-sm font-medium text-neutral-400">Au programme</h2>
        <ul className="mt-3 space-y-2">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2 text-neutral-300">
              <span aria-hidden className="text-emerald-500">
                —
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-neutral-500">Arrive en {phase}.</p>
      </section>
    </div>
  );
}
