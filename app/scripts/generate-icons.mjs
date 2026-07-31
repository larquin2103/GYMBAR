/**
 * Genera los iconos PNG de la PWA (192, 512 y maskable 512) a partir de un SVG.
 * Requiere `sharp`. Ejecutar: `npm run icons --workspace @gymbar/app`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');

const PRIMARY = '#4f46e5';
const BG_DARK = '#0b0f17';

function logoSvg({ size, bg, radius, pad }) {
  const c = size / 2;
  const s = size - pad * 2;
  const x = pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>
    <g transform="translate(${x},${x})" fill="none" stroke="#ffffff" stroke-width="${s * 0.07}" stroke-linecap="round">
      <path d="M${s * 0.28} ${s * 0.36}V${s * 0.64}M${s * 0.72} ${s * 0.36}V${s * 0.64}"/>
      <path d="M${s * 0.18} ${s * 0.44}V${s * 0.56}M${s * 0.82} ${s * 0.44}V${s * 0.56}"/>
      <path d="M${s * 0.28} ${c - x}H${s * 0.72}"/>
    </g>
  </svg>`;
}

async function render(name, svg, size) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(join(outDir, name), png);
  console.log('✓', name);
}

await mkdir(outDir, { recursive: true });

await render('icon-192.png', logoSvg({ size: 192, bg: PRIMARY, radius: 42, pad: 20 }), 192);
await render('icon-512.png', logoSvg({ size: 512, bg: PRIMARY, radius: 112, pad: 54 }), 512);
// Maskable: fondo pleno y logo con más margen (safe zone).
await render(
  'icon-maskable-512.png',
  logoSvg({ size: 512, bg: BG_DARK, radius: 0, pad: 110 }),
  512,
);

// Apple touch icon (sin esquinas redondeadas; iOS las aplica).
await render(
  '../apple-touch-icon.png',
  logoSvg({ size: 180, bg: PRIMARY, radius: 0, pad: 22 }),
  180,
);

console.log('Iconos generados en', outDir);
