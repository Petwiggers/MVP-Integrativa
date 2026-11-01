import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Espaço de Escuta",
  manifest: "/totem/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Escuta", statusBarStyle: "black-translucent" },
  icons: {
    icon: "/totem/icons/192",
    apple: "/totem/icons/180",
  },
  formatDetection: { telephone: false, email: false, address: false },
};

// Sem zoom: escala fixa e sem pinça.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#24575a",
};

export default function TotemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
