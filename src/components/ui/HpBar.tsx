// RUNE WARS — полоска HP/ресурсов
import { cn } from "@/lib/utils";

interface HpBarProps {
  value: number;
  max: number;
  label?: string;
  color?: "red" | "blue" | "green" | "yellow" | "gold";
  className?: string;
  showNumbers?: boolean;
}

const colors: Record<NonNullable<HpBarProps["color"]>, string> = {
  red: "from-[#e23b3b] to-[#8b1a1a]",
  blue: "from-[#3b7be2] to-[#1a4a8b]",
  green: "from-[#3be26a] to-[#1a8b3a]",
  yellow: "from-[#e2c93b] to-[#8b7a1a]",
  gold: "from-[#f4d36a] to-[#c9a227]",
};

export function HpBar({
  value,
  max,
  label,
  color = "red",
  className,
  showNumbers = true,
}: HpBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {label && (
        <div className="flex items-center justify-between font-pixel text-[8px] uppercase tracking-widest text-rune-muted">
          <span>{label}</span>
          {showNumbers && (
            <span className="text-rune-text">
              {Math.max(0, Math.round(value))}/{max}
            </span>
          )}
        </div>
      )}
      <div className="relative h-3 w-full rounded-sm border border-[#3a2a5a] bg-[#0a0718] overflow-hidden">
        <div
          className={cn("h-full bg-gradient-to-b transition-all duration-300 ease-out", colors[color])}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="h-1/2 w-full bg-gradient-to-b from-white/25 to-transparent"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
