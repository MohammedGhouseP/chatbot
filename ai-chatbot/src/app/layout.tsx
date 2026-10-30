import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Desk | Product Assistant",
  description:
    "Compare catalog packages, calculate exact quantities, and confirm a quote before booking.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
