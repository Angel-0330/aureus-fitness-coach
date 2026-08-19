import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aureus Fitness Coach",
  description: "Gestión elegante para gimnasios, entrenadores y clientes que quieren evolucionar.",
  openGraph: {
    title: "Aureus Fitness Coach",
    description: "Entrena. Gestiona. Evoluciona.",
    url: "https://aureus-fitness-coach.ao155300.chatgpt.site",
    siteName: "Aureus Fitness Coach",
    images: [{ url: "https://aureus-fitness-coach.ao155300.chatgpt.site/og.png", width: 1200, height: 630, alt: "Aureus Fitness Coach" }],
    locale: "es_PA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aureus Fitness Coach",
    description: "Entrena. Gestiona. Evoluciona.",
    images: ["https://aureus-fitness-coach.ao155300.chatgpt.site/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="theme-dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
