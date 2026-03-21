import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zero to Agent",
  description:
    "Hackathon landing page concept for a Gemini-powered chatbot built on Vercel.",
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
