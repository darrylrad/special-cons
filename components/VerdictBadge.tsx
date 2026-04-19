import type { Verdict } from "@/src/api";

const STYLES: Record<Verdict, { bg: string; text: string; border: string; dot: string; label: string }> = {
  PROCEED: {
    bg: "bg-verdict-proceed/10",
    text: "text-verdict-proceed",
    border: "border-verdict-proceed/30",
    dot: "bg-verdict-proceed shadow-[0_0_12px_rgba(34,211,162,0.8)]",
    label: "Proceed",
  },
  "PROCEED WITH CAUTION": {
    bg: "bg-verdict-caution/10",
    text: "text-verdict-caution",
    border: "border-verdict-caution/30",
    dot: "bg-verdict-caution shadow-[0_0_12px_rgba(245,181,68,0.8)]",
    label: "Proceed with caution",
  },
  AVOID: {
    bg: "bg-verdict-avoid/10",
    text: "text-verdict-avoid",
    border: "border-verdict-avoid/30",
    dot: "bg-verdict-avoid shadow-[0_0_12px_rgba(240,106,106,0.8)]",
    label: "Avoid",
  },
};

export default function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const s = STYLES[verdict];
  return (
    <span
      className={`inline-flex items-center gap-2.5 rounded-full border px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] ${s.bg} ${s.text} ${s.border}`}
    >
      <span className={`h-6 w-6 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
