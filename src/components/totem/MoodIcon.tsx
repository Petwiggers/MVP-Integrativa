// Rostos geométricos próprios (sem emojis de marca). 1 = muito mal … 5 = muito bem.

const MOUTHS: Record<number, string> = {
  1: "M32 72 Q50 56 68 72",
  2: "M34 70 Q50 63 66 70",
  3: "M34 67 L66 67",
  4: "M34 63 Q50 72 66 63",
  5: "M30 60 Q50 80 70 60",
};

const BROWS: Record<number, string | null> = {
  1: "M28 34 L42 39 M72 34 L58 39",
  2: null,
  3: null,
  4: null,
  5: null,
};

export function MoodIcon({ mood, color, size = 96 }: { mood: number; color: string; size?: number }) {
  const brow = BROWS[mood];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill={color} />
      <circle cx="36" cy="45" r="5" fill="#1f2a2b" />
      <circle cx="64" cy="45" r="5" fill="#1f2a2b" />
      {brow && <path d={brow} stroke="#1f2a2b" strokeWidth="4" strokeLinecap="round" fill="none" />}
      <path d={MOUTHS[mood]} stroke="#1f2a2b" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
