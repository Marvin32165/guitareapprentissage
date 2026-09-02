export type IconName =
  | "home"
  | "theory"
  | "ear"
  | "metronome"
  | "chart"
  | "list";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Présent dans la barre du bas (mobile). */
  bottom: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: "home", bottom: true },
  { href: "/theorie", label: "Théorie", icon: "theory", bottom: true },
  { href: "/oreille", label: "Oreille", icon: "ear", bottom: true },
  { href: "/technique", label: "Technique", icon: "metronome", bottom: true },
  { href: "/progression", label: "Progrès", icon: "chart", bottom: true },
  { href: "/repertoire", label: "Répertoire", icon: "list", bottom: false },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
