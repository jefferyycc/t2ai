import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Train Train",
  description:
    "Personalized fitness MVP built with Next.js App Router, TypeScript, Gemini, and Vercel-compatible route handlers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
