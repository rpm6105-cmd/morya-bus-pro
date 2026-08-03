import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Morya Bus HRMS Pro - HR & Payroll Management",
  description: "Complete HR & Payroll Management System for Dharavi depot bus operations",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 3,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      </head>
      <body className={inter.className} suppressHydrationWarning>

        {children}
      </body>
    </html>
  );
}
