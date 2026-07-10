import "@/styles/tokens.css";
import type { Metadata, Viewport } from "next";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";

export const metadata: Metadata = {
  title: "Antisocial — Misfit Ministries",
  description: "Most misfits are antisocial. Come find out why that's not an insult here.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Antisocial" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#100d0c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
