import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/providers/toaster";
import { CommandPaletteProvider } from "@/components/layout/CommandPalette";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/Sidebar";
import { PROJECT } from "@/lib/project";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${PROJECT.slug}.vercel.app`),
  title: {
    default: `${PROJECT.name} — ${PROJECT.summary.replace(/\.$/, "")}`,
    template: `%s · ${PROJECT.name}`,
  },
  description: PROJECT.summary,
  applicationName: PROJECT.name,
  authors: [{ name: "Ignazio De Santis" }],
  keywords: [PROJECT.category, PROJECT.track, ...PROJECT.stack],
  openGraph: {
    type: "website",
    title: PROJECT.name,
    description: PROJECT.summary,
    siteName: PROJECT.name,
  },
  twitter: {
    card: "summary",
    title: PROJECT.name,
    description: PROJECT.summary,
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080d" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans">
        <ThemeProvider>
          <TooltipProvider delayDuration={150}>
            <CommandPaletteProvider>
              <div className="flex h-screen overflow-hidden bg-background text-foreground">
                <Sidebar />
                <main className="flex flex-1 flex-col overflow-hidden">
                  {children}
                </main>
              </div>
              <Toaster />
            </CommandPaletteProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
