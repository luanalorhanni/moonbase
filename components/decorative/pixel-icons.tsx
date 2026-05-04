type PixelProps = { size?: number; className?: string };

const grid = (size: number) => ({
  width: size,
  height: size,
  shapeRendering: "crispEdges" as const,
});

/**
 * The two moon glyphs render the same 3D moon image as the favicon — kept
 * as separate components so callers don't need to be touched. Sizing and
 * className keep their original meaning; the `text-*` colour classes
 * still apply to the surrounding container if any, but no longer tint
 * the artwork itself (it's a raster image).
 */
function MoonImage({ size = 16, className }: PixelProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/icon-192.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 select-none ${className ?? ""}`}
      draggable={false}
    />
  );
}

export function PixelMoonFull(props: PixelProps) {
  return <MoonImage {...props} />;
}

export function PixelMoonCrescent(props: PixelProps) {
  return <MoonImage {...props} />;
}

export function PixelStar({ size = 16, className }: PixelProps) {
  return (
    <svg viewBox="0 0 16 16" {...grid(size)} className={`pixel-svg ${className ?? ""}`}>
      <g fill="currentColor">
        <rect x="7" y="2" width="2" height="2" />
        <rect x="6" y="4" width="4" height="3" />
        <rect x="2" y="7" width="12" height="2" />
        <rect x="6" y="9" width="4" height="3" />
        <rect x="7" y="12" width="2" height="2" />
      </g>
    </svg>
  );
}

export function PixelStarSmall({ size = 8, className }: PixelProps) {
  return (
    <svg viewBox="0 0 8 8" {...grid(size)} className={`pixel-svg ${className ?? ""}`}>
      <g fill="currentColor">
        <rect x="3" y="0" width="2" height="2" />
        <rect x="0" y="3" width="8" height="2" />
        <rect x="3" y="6" width="2" height="2" />
      </g>
    </svg>
  );
}

export function PixelComet({ size = 16, className }: PixelProps) {
  return (
    <svg viewBox="0 0 16 16" {...grid(size)} className={`pixel-svg ${className ?? ""}`}>
      <g fill="currentColor">
        <rect x="11" y="3" width="3" height="3" />
        <rect x="10" y="2" width="1" height="1" />
        <rect x="14" y="2" width="1" height="1" />
        <rect x="14" y="6" width="1" height="1" />
        <rect x="10" y="6" width="1" height="1" />
        <rect x="9" y="5" width="1" height="1" />
        <rect x="7" y="6" width="2" height="1" />
        <rect x="5" y="7" width="2" height="1" />
        <rect x="2" y="8" width="3" height="1" />
      </g>
    </svg>
  );
}

export function PixelPlanet({ size = 16, className }: PixelProps) {
  return (
    <svg viewBox="0 0 16 16" {...grid(size)} className={`pixel-svg ${className ?? ""}`}>
      <g fill="currentColor">
        <rect x="6" y="3" width="4" height="1" />
        <rect x="4" y="4" width="8" height="1" />
        <rect x="3" y="5" width="10" height="3" />
        <rect x="3" y="8" width="10" height="2" />
        <rect x="4" y="10" width="8" height="1" />
        <rect x="6" y="11" width="4" height="1" />
      </g>
      <g fill="oklch(0.65 0.10 200)" opacity="0.65">
        <rect x="0" y="9" width="3" height="1" />
        <rect x="13" y="6" width="3" height="1" />
      </g>
    </svg>
  );
}

export function ConstellationBullet({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`} aria-hidden>
      <PixelStarSmall size={8} className="text-primary" />
      <span className="bg-border-strong h-px w-3" />
      <PixelStarSmall size={6} className="text-primary/60" />
    </span>
  );
}
