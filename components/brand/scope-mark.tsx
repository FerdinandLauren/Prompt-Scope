import { cn } from "@/lib/utils";

type ScopeMarkProps = {
  size?: number;
  className?: string;
  progress?: number;
  label?: string;
};

/**
 * The aperture mark: one circle, eight dimension ticks, a fine crosshair.
 * The optional warm arc communicates a score without a second icon system.
 */
export function ScopeMark({ size = 28, className, progress = 0, label }: ScopeMarkProps) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progress));
  const dash = (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeOpacity="0.42" strokeWidth="1" />
      <circle
        cx="24"
        cy="24"
        r={radius}
        stroke="var(--orange)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform="rotate(-90 24 24)"
      />
      {Array.from({ length: 8 }).map((_, index) => {
        const angle = (index * Math.PI) / 4 - Math.PI / 2;
        const inner = 20.5;
        const outer = index % 2 === 0 ? 24 : 22.5;
        return (
          <line
            key={index}
            x1={24 + Math.cos(angle) * inner}
            y1={24 + Math.sin(angle) * inner}
            x2={24 + Math.cos(angle) * outer}
            y2={24 + Math.sin(angle) * outer}
            stroke="currentColor"
            strokeOpacity={index % 2 === 0 ? 0.75 : 0.35}
            strokeWidth="1"
          />
        );
      })}
      <line x1="24" y1="20" x2="24" y2="28" stroke="currentColor" strokeWidth="1" strokeOpacity="0.8" />
      <line x1="20" y1="24" x2="28" y2="24" stroke="currentColor" strokeWidth="1" strokeOpacity="0.8" />
      <circle cx="24" cy="24" r="1.25" fill="var(--orange)" />
    </svg>
  );
}
