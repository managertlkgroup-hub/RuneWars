// RUNE WARS — панель в стиле тёмного фэнтези
import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function RunePanel({ className, glow, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-[#3a2a5a] bg-gradient-to-b from-[#140d24]/95 to-[#0a0718]/95 backdrop-blur-sm",
        glow && "shadow-[0_0_24px_rgba(201,162,39,0.25)] border-[#c9a227]/60",
        className
      )}
      onContextMenu={(e) => e.preventDefault()}
      {...props}
    />
  );
}

export function PanelTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "font-pixel text-[10px] uppercase tracking-widest text-rune-gold text-glow-gold px-3 py-2 border-b border-[#3a2a5a]/60",
        className
      )}
    >
      {children}
    </div>
  );
}
