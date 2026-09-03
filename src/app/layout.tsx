import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { OutboxFlusher } from "@/components/offline/OutboxFlusher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Guitare — Apprentissage",
    template: "%s · Guitare",
  },
  description:
    "Théorie musicale et pratique de la guitare, ancrées sur le manche.",
  applicationName: "Guitare",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Guitare",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full">
        {children}
        <ServiceWorkerRegistrar />
        <OutboxFlusher />
      </body>
    </html>
  );
}
