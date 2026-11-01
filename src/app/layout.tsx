import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";

// Fonte desenhada para legibilidade (baixa visão), servida pelo próprio app.
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});

// Toda página é renderizada por requisição: a CSP usa nonce novo a cada resposta
// (página estática sairia sem nonce e teria os scripts bloqueados).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Espaço de Escuta",
  description: "Um lugar seguro para conversar.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={atkinson.variable}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
