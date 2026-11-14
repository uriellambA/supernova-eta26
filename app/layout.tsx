import type { Metadata, Viewport } from "next";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/config/app";
import { RegistrarSW } from "@/components/RegistrarSW";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} · ${APP_TAGLINE}`,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#05080f", width: "device-width", initialScale: 1, colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
