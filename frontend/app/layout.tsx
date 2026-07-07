import type { Metadata } from "next";
import "./globals.css";
import { MswProvider } from "@/components/MswProvider";

export const metadata: Metadata = {
  title: "Практика",
  description: "Система организации студенческой практики",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-background font-sans antialiased">
        <MswProvider>
          <div className="relative flex min-h-screen flex-col">{children}</div>
        </MswProvider>
      </body>
    </html>
  );
}