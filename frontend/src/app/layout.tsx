import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "HRM Nhân Phú - Hệ thống Quản lý Nhân sự",
  description: "Hệ thống Quản lý Nhân sự Công ty Du học Nhân Phú - Quản lý nhân viên, KPI, chấm công, CRM và báo cáo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="zalo-platform-site-verification" content="KyMHExZWGcD7dfOunx4Z1W6NkoLjuM5rDJav" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
