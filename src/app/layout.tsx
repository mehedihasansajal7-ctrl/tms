import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transport Management System",
  description: "Company transport management — requests, approvals, assignments, and trips.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
