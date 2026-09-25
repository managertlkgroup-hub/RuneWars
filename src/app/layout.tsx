import type { Metadata, Viewport } from "next";
import { Press_Start_2P, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const pressStart2P = Press_Start_2P({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RUNE WARS — Match-3 RPG",
  description: "Тёмное фэнтези Match-3 RPG с роглайк-петлёй. Собирай линии рун, побеждай врагов, прокачивай героев.",
  keywords: ["Rune Wars", "Match-3", "RPG", "Roguelike", "Yandex Games", "dark fantasy"],
  authors: [{ name: "Rune Wars" }],
  icons: {
    icon: "/logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0718",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${pressStart2P.variable} ${inter.variable} antialiased bg-rune-bg text-rune-fg`}
        style={{ overflow: "hidden" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
