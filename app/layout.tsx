import type { Metadata, Viewport } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";
import { Encabezado } from "@/components/Encabezado";
import { RegistrarSW } from "@/components/RegistrarSW";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} · Alto Valle`, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Encabezado />
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
