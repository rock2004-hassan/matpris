import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MatPris – Jämför matpriser | مات بريس",
  description:
    "Jämför priser och erbjudanden från ICA, Willys, Lidl och Matvärlden. قارن الأسعار والعروض.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased min-h-screen bg-slate-100">
        {children}
      </body>
    </html>
  );
}
