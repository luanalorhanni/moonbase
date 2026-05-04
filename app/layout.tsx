import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Onest } from "next/font/google";

import { Starfield } from "@/components/decorative/starfield";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const jetMono = JetBrains_Mono({
  variable: "--font-jet-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "moonbase",
  description: "personal finance monitoring.",
  manifest: "/manifest.json",
  applicationName: "moonbase",
  appleWebApp: {
    capable: true,
    title: "moonbase",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1d2e" },
  ],
  // Cover the iOS notch / Android cutout area so the PWA looks edge-to-edge.
  viewportFit: "cover",
  // Allow user zoom for accessibility but discourage initial zoom-in.
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${onest.variable} ${fraunces.variable} ${jetMono.variable} h-full antialiased`}
    >
      <body className="bg-background relative flex min-h-full flex-col overflow-x-hidden">
        <ThemeProvider>
          <div className="ambient" aria-hidden />
          <Starfield />
          <div className="relative z-10 flex min-h-full flex-1 flex-col">{children}</div>
          <ServiceWorkerRegister />
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
