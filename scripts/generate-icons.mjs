/**
 * One-shot icon generator. Renders public/icons/icon.svg into PNGs at the
 * sizes required by the PWA manifest and iOS home-screen.
 *
 * Run with: node scripts/generate-icons.mjs
 *
 * The maskable variant uses an inset-safe-zone version of the SVG so the
 * moon disc isn't clipped by Android adaptive-icon masks.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

const root = process.cwd();
const iconsDir = join(root, "public", "icons");
const sourceSvg = await readFile(join(iconsDir, "icon.svg"));

const safeZoneSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="moonFill" cx="38%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fafaf6" />
      <stop offset="70%" stop-color="#e9e7df" />
      <stop offset="100%" stop-color="#cfccc0" />
    </radialGradient>
    <radialGradient id="bgFill" cx="50%" cy="40%" r="75%">
      <stop offset="0%" stop-color="#262a40" />
      <stop offset="100%" stop-color="#1a1d2e" />
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bgFill)" />
  <circle cx="256" cy="256" r="120" fill="url(#moonFill)" />
</svg>`;

const targets = [
  { name: "icon-192.png", size: 192, source: sourceSvg },
  { name: "icon-512.png", size: 512, source: sourceSvg },
  { name: "icon-512-maskable.png", size: 512, source: Buffer.from(safeZoneSvg) },
  { name: "apple-touch-icon.png", size: 180, source: sourceSvg },
];

for (const t of targets) {
  const out = join(iconsDir, t.name);
  await sharp(t.source).resize(t.size, t.size).png({ compressionLevel: 9 }).toFile(out);
  process.stdout.write(`wrote ${t.name}\n`);
}

await writeFile(join(iconsDir, ".keep"), "");
