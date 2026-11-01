import { ImageResponse } from "next/og";

const SIZES = new Set([180, 192, 512]);

// Ícone gerado em PNG: duas mãos estilizadas acolhendo um círculo (sem marca).
export async function GET(request: Request, ctx: { params: Promise<{ size: string }> }) {
  const size = Number((await ctx.params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  const maskable = new URL(request.url).searchParams.has("maskable");
  const inner = maskable ? size * 0.6 : size * 0.78;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#24575a",
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <svg width={inner} height={inner} viewBox="0 0 100 100">
          <circle cx="50" cy="38" r="14" fill="#f6c99b" />
          <path
            d="M12 52 C 12 76, 34 88, 50 88 C 66 88, 88 76, 88 52"
            stroke="#f6f2ec"
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
