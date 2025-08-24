import type { Metadata } from "next";
import "./globals.css";
import { RealTimeProvider } from "./contexts/RealTimeContext";
import { AuthProvider } from "./contexts/AuthContext";
import SidebarLayout from "./components/SidebarLayout";

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
  description: "Aurelo is a personal finance app that lets you securely track your investments and cash accounts across multiple brokerages and banks — all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png"/>
        {/* <meta name="theme-color" content="#f9fafb"/> */}
        <meta name="theme-color" content="#fff"/> 
        <link rel="icon" href="/favicon/favicon.ico"/>
        <link rel="icon" type="image/png" sizes="512x512" href="/favicon/android-chrome-512x512.png"/>
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon/android-chrome-192x192.png"/>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png"/>
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png"/>
        <link rel="manifest" href="/favicon/site.webmanifest"/>
      </head>
      <body>
        <AuthProvider>
          <RealTimeProvider>
            <SidebarLayout>
              {children}
            </SidebarLayout>
          </RealTimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
