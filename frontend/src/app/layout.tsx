import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AccordOps AI",
  description:
    "AI-powered contract intelligence and operational control platform",
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
