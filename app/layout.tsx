import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Onest } from "next/font/google";

import { Starfield } from "@/components/decorative/starfield";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
  description: "personal finance, charted from a quiet observatory.",
  manifest: "/manifest.json",
  applicationName: "moonbase",
  appleWebApp: {
    capable: true,
    title: "moonbase",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1d2e",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${onest.variable} ${jetMono.variable} h-full antialiased`}>
      <body className="relative flex min-h-full flex-col overflow-x-hidden">
        <Starfield />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">{children}</div>
        <ServiceWorkerRegister />
        <Toaster richColors closeButton position="top-right" theme="dark" />
      </body>
    </html>
  );
}
