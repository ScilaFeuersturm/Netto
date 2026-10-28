// Genera el ícono de Inariko (el zorro de hojas) y sus variantes en assets/. Correr desde mobile/:
//   node scripts/generar-iconos.mjs
//
// El dibujo es SVG; lo pasa a PNG Google Chrome en modo headless (tiene que estar instalado en
// /Applications o en CHROME) y pngjs, que ya viene con Expo, hace los retoques. No hace falta
// instalar nada. Todas las medidas están en un lienzo de 1024 × 1024.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const CHROME =
  process.env.CHROME ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const f = (n) => n.toFixed(1);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Hoja facetada con nervadura en S: se abomba cerca de la base y la punta se abre hacia afuera.
 * Devuelve las dos mitades (clara y oscura) a cada lado de la nervadura.
 */
function leaf([bx, by], [tx, ty], w, bend, flare = 0.35) {
  const len = Math.hypot(tx - bx, ty - by);
  const px = -(ty - by) / len;
  const py = (tx - bx) / len;
  const at = (t, off) => [
    lerp(bx, tx, t) + px * off,
    lerp(by, ty, t) + py * off,
  ];
  const c1 = at(0.33, bend);
  const c2 = at(0.7, -bend * flare);
  const spine = `M${f(bx)},${f(by)} C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(tx)},${f(ty)}`;
  const half = (k) => {
    const a = at(0.3, bend + k * w);
    const b = at(0.72, -bend * flare + k * w * 0.7);
    return `${spine} C${f(b[0])},${f(b[1])} ${f(a[0])},${f(a[1])} ${f(bx)},${f(by)}Z`;
  };
  return [
    ["light", half(1)],
    ["dark", half(-1)],
  ];
}

// Cada pieza: [tono, contorno]. 'light' y 'dark' son las dos caras del oro rosa; 'hole' son los
// detalles en el color del fondo (ojo e interior de la oreja), que en los monocromos quedan calados.
const FOX = [
  // Hojas del lado izquierdo, en abanico desde el pecho, y la cola que sube a la derecha.
  ...leaf([500, 800], [440, 165], 58, -70),
  ...leaf([495, 805], [262, 285], 64, -80),
  ...leaf([495, 812], [190, 468], 60, -70),
  ...leaf([500, 820], [218, 655], 50, -45),
  ...leaf([525, 842], [850, 540], 62, 90),
  // Cuello y cuerpo en S, de la mejilla a la base.
  ["light", "M570,455 C515,560 495,690 515,842 C565,720 615,640 640,520 Z"],
  [
    "dark",
    "M640,520 C615,640 565,720 515,842 C655,760 725,630 700,448 L620,440 Z",
  ],
  // Oreja de atrás.
  ["dark", "M532,345 C535,300 545,250 560,200 C580,245 595,280 605,315 Z"],
  // Cara: frente y hocico (claro); mejilla con el mechón (oscuro).
  [
    "light",
    "M528,352 C540,320 565,305 590,300 C598,265 606,235 620,200 C636,245 648,285 655,322 C690,350 722,392 765,440 C710,440 660,436 612,432 C585,420 548,395 528,352 Z",
  ],
  [
    "dark",
    "M612,432 C660,436 710,440 765,440 C730,468 690,484 650,490 C622,494 598,502 572,516 C580,470 552,420 528,352 C548,395 585,420 612,432 Z",
  ],
  ["inner", "M620,240 C628,268 636,296 640,322 L612,312 Z"],
  ["hole", "M630,376 Q655,362 682,384 Q654,392 630,376Z"],
];

const GRADIENTS = `<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#11505A"/><stop offset="1" stop-color="#082C32"/></linearGradient>
<linearGradient id="light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6D2B8"/><stop offset="1" stop-color="#E0A27F"/></linearGradient>
<linearGradient id="dark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C98462"/><stop offset="1" stop-color="#8C4F33"/></linearGradient>
</defs>`;

// El dibujo ocupa x 190–850, y 165–842: este es su centro, para centrarlo al escalar.
const CENTER = [520, 503];

/**
 * Arma el SVG. `scale` achica el zorro alrededor del centro del lienzo; `background` es 'square'
 * (lleno), 'rounded' (cuadrado con esquinas redondeadas) o ninguno; `mono` lo pinta todo de blanco
 * con el ojo y la oreja calados (para los íconos que el sistema tiñe).
 */
function svg({ scale = 1, background, mono = false }) {
  const paint = {
    light: "url(#light)",
    dark: "url(#dark)",
    inner: "#8C4F33",
    hole: "#0B3A41",
  };
  const body = mono
    ? `<mask id="m"><rect width="1024" height="1024" fill="#000"/>${FOX.map(
        // El trazo blanco tapa las líneas finas que el antialias deja entre las dos mitades.
        ([tone, d]) =>
          tone === "hole" || tone === "inner"
            ? `<path d="${d}" fill="#000"/>`
            : `<path d="${d}" fill="#fff" stroke="#fff" stroke-width="3"/>`,
      ).join(
        "",
      )}</mask><rect width="1024" height="1024" fill="#fff" mask="url(#m)"/>`
    : FOX.map(([tone, d]) => `<path d="${d}" fill="${paint[tone]}"/>`).join("");
  const bg =
    background === "square"
      ? '<rect width="1024" height="1024" fill="url(#bg)"/>'
      : background === "rounded"
        ? '<rect width="1024" height="1024" rx="230" fill="url(#bg)"/>'
        : "";
  const move = `translate(512 512) scale(${scale}) translate(${-CENTER[0]} ${-CENTER[1]})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${GRADIENTS}${bg}<g transform="${move}">${body}</g></svg>`;
}

const work = mkdtempSync(join(tmpdir(), "inariko-iconos-"));

/** Pasa el SVG a PNG del tamaño pedido con Chrome. `opaque` saca el canal alfa (App Store lo exige). */
function render(size, options, { opaque = false } = {}) {
  const page = join(work, "icono.html");
  const shot = join(work, "icono.png");
  writeFileSync(
    page,
    `<html><body style="margin:0"><div style="width:${size}px;height:${size}px">${svg(options).replace("<svg ", `<svg width="${size}" height="${size}" `)}</div></body></html>`,
  );
  execFileSync(
    CHROME,
    [
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--default-background-color=00000000",
      `--window-size=${size},${size}`,
      `--screenshot=${shot}`,
      `file://${page}`,
    ],
    { stdio: "ignore" },
  );
  const png = PNG.sync.read(readFileSync(shot));
  return PNG.sync.write(
    png,
    opaque ? { colorType: 2, inputHasAlpha: true } : {},
  );
}

const out = (name, data) => {
  writeFileSync(new URL(`../assets/${name}`, import.meta.url), data);
  console.log(`assets/${name}`);
};

// iOS y tiendas: cuadrado lleno (el sistema redondea las esquinas; no admite transparencia).
out(
  "icon.png",
  render(1024, { background: "square", scale: 0.92 }, { opaque: true }),
);

// Android: el fondo es un color en app.json; el zorro va achicado para que entre entero en el
// círculo de la zona segura (66 de 108 dp) aunque el teléfono recorte el ícono en círculo.
out("android-icon-foreground.png", render(1024, { scale: 0.84 }));
// Monocromo (íconos temáticos de Android 13+): silueta blanca con el ojo calado.
out("android-icon-monochrome.png", render(1024, { scale: 0.84, mono: true }));

// Notificaciones de Android: silueta blanca sobre transparente (el sistema la pinta con el color de
// app.json). Más grande que el monocromo porque acá no hay recorte en círculo.
out("notification-icon.png", render(96, { scale: 1.3, mono: true }));

// Pantalla de carga: el ícono con esquinas redondeadas, sobre el fondo de la app.
out("splash-icon.png", render(1024, { background: "rounded", scale: 0.92 }));

// Web.
out("favicon.png", render(48, { background: "square", scale: 0.95 }));
