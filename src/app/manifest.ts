import type { MetadataRoute } from "next";

// PWA manifest — makes Antisocial installable from the browser
// ("Add to Home Screen"), full-screen, own icon. No app store between
// a misfit and the door.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Antisocial — Misfit Ministries",
    short_name: "Antisocial",
    description: "Most misfits are antisocial. That's not an insult here — it's how you got in the door.",
    start_url: "/",
    display: "standalone",
    background_color: "#100d0c",
    theme_color: "#100d0c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
