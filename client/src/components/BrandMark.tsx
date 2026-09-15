/**
 * DevCast brand mark — a lightweight vector echo of the full PNG logo
 * (violet→cyan gradient tile, broadcast "play" glyph, code brackets).
 *
 * Used in app chrome (sidebar, headers) where shipping the 1.5 MB raster
 * lockup on every page would be wasteful. The full raster logo lives on the
 * login screen. The gradient is hard-coded (not token-based) so the mark reads
 * identically in both themes — it sits on its own dark tile either way.
 */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="DevCast"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="devcast-mark-grad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      {/* Gradient tile */}
      <rect width="40" height="40" rx="12" fill="url(#devcast-mark-grad)" />
      {/* Code brackets flanking a broadcast "play" — the DevCast motif */}
      <path
        d="M13.5 14.5 L9.5 20 L13.5 25.5"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <path
        d="M26.5 14.5 L30.5 20 L26.5 25.5"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <path d="M18 15 L25 20 L18 25 Z" fill="#ffffff" />
    </svg>
  );
}
