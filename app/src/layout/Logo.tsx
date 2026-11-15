/** The Baseera mark (the team's logo): a cyan planet, an orbit ring and a gold guide star (simplified from the brand logo). */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="17" r="8" className="fill-cyan-400" />
      <ellipse cx="16" cy="17" rx="14" ry="5" fill="none" strokeWidth="1.6" className="stroke-contrast" transform="rotate(-20 16 17)" />
      <path d="M26 5 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z" className="fill-gold-200" />
    </svg>
  );
}
