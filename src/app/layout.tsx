import "@/styles/tokens.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Antisocial — Misfit Ministries",
  description: "Most misfits are antisocial. Come find out why that's not an insult here.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
