import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "T2AI | Train Train",
  description:
    "A personalized fitness MVP built with Next.js, Vercel, Gemini, and real Hevy + Oura history.",
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
