import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aurelo — Simplify Your Investment Portfolio",
  keywords: [
    "investment tracking",
    "portfolio management",
    "stock tracker",
    "personal finance",
    "investing app",
    "wealth tracking",
    "Aurelo"
  ],
  description: "Aurelo is a personal finance app that lets you securely track your investments and cash accounts across multiple brokerages and banks — all in one place, with privacy built in.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
