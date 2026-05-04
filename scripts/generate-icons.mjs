/**
 * One-shot icon generator. Converts the moon source image into the icon set
 * the manifest expects:
 *   - public/icons/icon-192.png         (any)
 *   - public/icons/icon-512.png         (any)
 *   - public/icons/icon-512-maskable.png (with safe-zone padding so OS masks
 *                                          don't clip the moon)
 *   - public/icons/apple-touch-icon.png (180×180)
 *   - app/favicon.ico                   (32×32 PNG payload — browsers accept
 *                                          PNG at the .ico path)
 *
 * Run with: node scripts/generate-icons.mjs
 */

import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const SRC = "C:/Users/luana/Downloads/lua-3d-icon-png-download-4409262.webp";

async function squareWithBackground(size, padding = 0) {
  const inner = size - padding * 2;
  const moon = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: moon, left: padding, top: padding }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

console.log("→ icon-192.png");
await writeFile("public/icons/icon-192.png", await squareWithBackground(192, 0));

console.log("→ icon-512.png");
await writeFile("public/icons/icon-512.png", await squareWithBackground(512, 0));

console.log("→ icon-512-maskable.png (~10% safe-zone padding)");
await writeFile("public/icons/icon-512-maskable.png", await squareWithBackground(512, 60));

console.log("→ apple-touch-icon.png (180×180)");
await writeFile("public/icons/apple-touch-icon.png", await squareWithBackground(180, 0));

console.log("→ app/favicon.ico (32×32 PNG payload)");
await writeFile("app/favicon.ico", await squareWithBackground(32, 0));

console.log("done.");
