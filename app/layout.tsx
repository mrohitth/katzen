import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "KATZEN — Kitty's Zen",
  description: "Mission Control Dashboard for OpenClaw",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-obsidian text-text-primary font-sans antialiased">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}