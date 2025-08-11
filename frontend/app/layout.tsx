import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fintra",
  keywords: ["finance", "stocks", "investing"],
  description: "Personal finance app for tracking investments and stocks.",
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
