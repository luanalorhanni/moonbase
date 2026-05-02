/**
 * Pure-CSS starfield + occasional comet. Two twinkle layers run at offset
 * speeds so the field shimmers organically; the comet streaks across once
 * every ~47s. No JS, no canvas — see app/globals.css for the rules.
 */
export function Starfield() {
  return (
    <div className="starfield" aria-hidden>
      <span className="comet" />
    </div>
  );
}
