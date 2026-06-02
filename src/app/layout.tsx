import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Movilidad — Asistente de transporte",
  description: "Compará precios de Uber y DiDi, recibí predicciones de destino y registrá tus viajes. Asistente de movilidad para Sofía.",
  keywords: ["movilidad", "Uber", "DiDi", "transporte", "Santa Fe", "Argentina"],
  authors: [{ name: "Movilidad App" }],
  icons: {
    icon: "🧭",
  },
  openGraph: {
    title: "Movilidad — Asistente de transporte",
    description: "Compará precios de Uber y DiDi, recibí predicciones de destino",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Movilidad — Asistente de transporte",
    description: "Compará precios de Uber y DiDi",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
