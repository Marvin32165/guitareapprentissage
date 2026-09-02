import { AppShell } from "@/components/nav/AppShell";
import { AudioProvider } from "@/components/audio/AudioProvider";

// Layout des pages authentifiées : fournit le contexte audio (déverrouillage
// iOS) et la coquille responsive (barre du bas mobile / latérale desktop).
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AudioProvider>
      <AppShell>{children}</AppShell>
    </AudioProvider>
  );
}
