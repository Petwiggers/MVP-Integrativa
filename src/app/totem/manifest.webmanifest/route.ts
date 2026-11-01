import { getSettings } from "@/server/settings";

// Manifest dinâmico para a orientação vir da configuração do painel.
export async function GET() {
  let orientation: "any" | "portrait" | "landscape" = "any";
  try {
    orientation = (await getSettings()).orientation;
  } catch {
    // Sem banco disponível, o PWA continua instalável com orientação livre.
  }

  const manifest = {
    name: "Espaço de Escuta",
    short_name: "Escuta",
    description: "Um lugar seguro para conversar.",
    id: "/totem",
    start_url: "/totem",
    scope: "/totem",
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    orientation,
    background_color: "#f6f2ec",
    theme_color: "#24575a",
    lang: "pt-BR",
    icons: [
      { src: "/totem/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/totem/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/totem/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-cache" },
  });
}
