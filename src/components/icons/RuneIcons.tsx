// RUNE WARS — hand-written SVG-иконки 9 рун (НЕ AI-сгенерированные)

import type { RuneId } from "@/game/content/runes";

interface IconProps {
  size?: number;
  className?: string;
}

const DEFS = (id: string) => (
  <>
    <defs>
      <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f4d36a" />
        <stop offset="100%" stopColor="#8b6a14" />
      </linearGradient>
      <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.6" />
      </filter>
    </defs>
  </>
);

const WRAP = ({ children, size, viewBox }: { children: React.ReactNode; size: number; viewBox: string }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block" }}
  >
    {children}
  </svg>
);

export function RuneIcon({ rune, size = 40, className }: { rune: RuneId; size?: number; className?: string }) {
  const props = { size, className };
  switch (rune) {
    case "fire":
      return <FireIcon {...props} />;
    case "ice":
      return <IceIcon {...props} />;
    case "life":
      return <LifeIcon {...props} />;
    case "wrath":
      return <WrathIcon {...props} />;
    case "chaos":
      return <ChaosIcon {...props} />;
    case "smith":
      return <SmithIcon {...props} />;
    case "vampire":
      return <VampireIcon {...props} />;
    case "guardian":
      return <GuardianIcon {...props} />;
    case "sage":
      return <SageIcon {...props} />;
  }
}

function FireIcon({ size }: IconProps) {
  const id = "fire";
  return (
    <WRAP size={size} viewBox="0 0 48 48">
      <DEFS id={id} />
      <g filter={`url(#${id}-shadow)`}>
        {/* пламя */}
        <path
          d="M24 4 C 26 12, 36 14, 36 26 C 36 36, 30 44, 24 44 C 18 44, 12 36, 12 26 C 12 20, 16 18, 18 14 C 19 18, 21 20, 22 16 C 23 12, 22 8, 24 4 Z"
          fill={`url(#${id}-grad)`}
          stroke="#1a0a1e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M24 14 C 25 18, 29 20, 29 28 C 29 34, 26 38, 24 38 C 22 38, 19 34, 19 28 C 19 22, 22 20, 24 14 Z"
          fill="#ff6a22"
          stroke="#1a0a1e"
          strokeWidth="1.5"
        />
        <ellipse cx="24" cy="30" rx="3" ry="5" fill="#ffeebb" />
      </g>
    </WRAP>
  );
}

function IceIcon({ size }: IconProps) {
  const id = "ice";
  return (
    <WRAP size={size} viewBox="0 0 48 48">
      <DEFS id={id} />
      <g filter={`url(#${id}-shadow)`} stroke="#1a0a1e" strokeWidth="2" strokeLinecap="round">
        {/* снежинка */}
        <g fill={`url(#${id}-grad)`}>
          <line x1="24" y1="6" x2="24" y2="42" />
          <line x1="9" y1="15" x2="39" y2="33" />
          <line x1="39" y1="15" x2="9" y2="33" />
        </g>
        {/* веточки */}
        <g stroke="#7fb0ff" strokeWidth="2.5">
          <path d="M24 6 L 20 12 M24 6 L 28 12" fill="none" />
          <path d="M24 42 L 20 36 M24 42 L 28 36" fill="none" />
          <path d="M9 15 L 14 16 M9 15 L 10 20" fill="none" />
          <path d="M39 33 L 34 32 M39 33 L 38 28" fill="none" />
          <path d="M39 15 L 34 16 M39 15 L 38 20" fill="none" />
          <path d="M9 33 L 14 32 M9 33 L 10 28" fill="none" />
        </g>
        <circle cx="24" cy="24" r="4" fill="#aaddff" stroke="#1a0a1e" strokeWidth="2" />
      </g>
    </WRAP>
  );
}

function LifeIcon({ size }: IconProps) {
  const id = "life";
  return (
    <WRAP size={size} viewBox="0 0 48 48">
      <DEFS id={id} />
      <g filter={`url(#${id}-shadow)`}>
        {/* лист */}
        <path
          d="M10 38 C 10 20, 24 6, 40 8 C 42 24, 30 40, 10 38 Z"
          fill="#3be26a"
          stroke="#1a0a1e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M10 38 C 18 30, 28 20, 40 8"
          fill="none"
          stroke="#1a8b3a"
          strokeWidth="2"
        />
        {/* прожилки */}
        <path d="M18 30 L 26 22 M22 26 L 32 16 M14 34 L 22 26" stroke="#1a8b3a" strokeWidth="1.5" fill="none" />
        <ellipse cx="20" cy="14" rx="6" ry="3" fill={`url(#${id}-shine)`} transform="rotate(-30 20 14)" />
      </g>
    </WRAP>
  );
}

function WrathIcon({ size }: IconProps) {
  const id = "wrath";
  return (
    <WRAP size={size} viewBox="0 0 48 48">
      <DEFS id={id} />
      <g filter={`url(#${id}-shadow)`}>
        {/* молния в кулаке */}
        <path
          d="M26 4 L 14 24 L 22 24 L 18 44 L 34 20 L 26 20 L 30 4 Z"
          fill={`url(#${id}-grad)`}
          stroke="#1a0a1e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M26 4 L 14 24 L 22 24 L 18 44 L 34 20 L 26 20 L 30 4 Z"
          fill={`url(#${id}-shine)`}
          opacity="0.5"
        />
      </g>
    </WRAP>
  );
}

function ChaosIcon({ size }: IconProps) {
  const id = "chaos";
  return (
    <WRAP size={size} viewBox="0 0 48 48">
      <DEFS id={id} />
      <g filter={`url(#${id}-shadow)`}>
        {/* спираль + глаз */}
        <circle cx="24" cy="24" r="18" fill="#2a1a3a" stroke="#aa44ff" strokeWidth="2" />
        <path
          d="M24 24 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M24 24 m -6 0 a 6 6 0 1 0 12 0 M24 24 m -10 0 a 10 10 0 1 0 20 0 M24 24 m -14 0 a 14 14 0 1 0 28 0"
          fill="none"
          stroke="#aa44ff"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="24" cy="24" rx="10" ry="6" fill="#ffeebb" stroke="#1a0a1e" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="3.5" fill="#aa44ff" />
        <circle cx="23" cy="23" r="1" fill="#fff" />
      </g>
    </WRAP>
  );
}

function SmithIcon({ size }: IconProps) {
  const id = "smith";
  return (
    <WRAP size={size} viewBox="0 0 48 48">
      <DEFS id={id} />
      <g filter={`url(#${id}-shadow)`} stroke="#1a0a1e" strokeWidth="2" strokeLinejoin="round">
        {/* молот */}
        <rect x="8" y="10" width="32" height="14" rx="2" fill="#8a8a9a" />
        <rect x="10" y="12" width="28" height="4" fill={`url(#${id}-shine)`} />
        <rect x="8" y="18" width="32" height="3" fill="#3a3a4a" />
        {/* рукоятка */}
        <rect x="22" y="24" width="4" height="18" fill="#7a4a1a" />
        <rect x="20" y="40" width="8" height="3" fill="#5a2a0a" />
        {/* искры */}
        <circle cx="14" cy="8" r="1.5" fill="#ff6a22" />
        <circle cx="36" cy="7" r="1" fill="#ffaa33" />
        <circle cx="40" cy="14" r="1.2" fill="#ff6a22" />
      </g>
    </WRAP>
  );
}

function VampireIcon({ size }: IconProps) {
  const id = "vampire";
  return (
    <WRAP size={size} viewBox="0 0 48 48">
      <DEFS id={id} />
      <g filter={`url(#${id}-shadow)`}>
        {/* капля крови */}
        <path
          d="M24 4 C 30 18, 38 24, 38 32 C 38 40, 32 44, 24 44 C 16 44, 10 40, 10 32 C 10 24, 18 18, 24 4 Z"
          fill="#8b1a1a"
          stroke="#1a0a1e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <ellipse cx="20" cy="16" rx="5" ry="8" fill="#ff5555" opacity="0.6" />
        {/* клыки */}
        <path d="M20 32 L 19 38 L 22 34 Z M28 32 L 29 38 L 26 34 Z" fill="#e8dcc0" stroke="#1a0a1e" strokeWidth="1" />
      </g>
    </WRAP>
  );
}

function GuardianIcon({ size }: IconProps) {
  const id = "guardian";
  return (
    <WRAP size={size} viewBox="0 0 48 48">
      <DEFS id={id} />
      <g filter={`url(#${id}-shadow)`}>
        {/* щит */}
        <path
          d="M24 4 L 40 10 L 40 26 C 40 36, 32 42, 24 44 C 16 42, 8 36, 8 26 L 8 10 Z"
          fill={`url(#${id}-grad)`}
          stroke="#1a0a1e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M24 4 L 40 10 L 40 26 C 40 36, 32 42, 24 44 C 16 42, 8 36, 8 26 L 8 10 Z"
          fill={`url(#${id}-shine)`}
          opacity="0.4"
        />
        {/* крест */}
        <path d="M24 14 L 24 34 M16 22 L 32 22" stroke="#1a0a1e" strokeWidth="3" strokeLinecap="round" />
        <path d="M24 14 L 24 34 M16 22 L 32 22" stroke="#f4d36a" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </WRAP>
  );
}

function SageIcon({ size }: IconProps) {
  const id = "sage";
  return (
    <WRAP size={size} viewBox="0 0 48 48">
      <DEFS id={id} />
      <g filter={`url(#${id}-shadow)`} stroke="#1a0a1e" strokeWidth="2" strokeLinejoin="round">
        {/* книга */}
        <path d="M8 10 L 22 14 L 22 40 L 8 36 Z" fill="#7a4a1a" />
        <path d="M40 10 L 26 14 L 26 40 L 40 36 Z" fill="#5a2a0a" />
        <rect x="22" y="14" width="4" height="26" fill="#c9a227" />
        {/* руны на страницах */}
        <path d="M12 20 L 17 22 L 12 24 M12 28 L 17 30" stroke="#f4d36a" strokeWidth="1.5" fill="none" />
        <path d="M31 20 L 36 22 L 31 24 M31 28 L 36 30" stroke="#f4d36a" strokeWidth="1.5" fill="none" />
      </g>
    </WRAP>
  );
}
