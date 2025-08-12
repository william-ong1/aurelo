import type { Metadata } from "next";
import "./globals.css";
import { RealTimeProvider } from "./contexts/RealTimeContext";

export const metadata: Metadata = {
  title: "Aurelo",
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
      <body>
        <RealTimeProvider>
          {children}
        </RealTimeProvider>
      </body>
    </html>
  );
}
