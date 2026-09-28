// RUNE WARS — кнопка в стиле тёмного фэнтези
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "danger" | "gold";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-[#3a2a5a] to-[#1f1638] border-[#c9a227] text-rune-text hover:from-[#4a3a6a] hover:to-[#2a1f4a] hover:border-rune-gold-light",
  gold:
    "bg-gradient-to-b from-[#d4a52a] to-[#8b6a14] border-[#f4d36a] text-[#1a0a1e] hover:from-[#e4b53a] hover:to-[#9b7a1f] font-bold",
  danger:
    "bg-gradient-to-b from-[#8b1a1a] to-[#5a0f0f] border-[#c03030] text-rune-text hover:from-[#a52a2a] hover:to-[#6a1515]",
  ghost:
    "bg-transparent border-[#3a2a5a] text-rune-muted hover:text-rune-text hover:border-[#6a4a9a] hover:bg-[#1f1638]",
};

export const RuneButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "relative px-4 py-2 rounded-md border-2 transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none font-body text-sm uppercase tracking-wider",
        variants[variant],
        className
      )}
      onContextMenu={(e) => e.preventDefault()}
      {...props}
    />
  )
);
RuneButton.displayName = "RuneButton";
