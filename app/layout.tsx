import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Paw & Co. | Thoughtfully chosen pet essentials", template: "%s | Paw & Co." },
  description: "Food, toys and everyday essentials for pets in Pakistan. Explore Paw & Co. in Pakistani Rupees.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
