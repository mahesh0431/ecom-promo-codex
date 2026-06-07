import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "eCommerce Promotion Cockpit",
  description: "A local eCommerce promo workflow powered by Codex."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
