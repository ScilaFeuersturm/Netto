// Genera el ícono "talón" de Netto y sus variantes en assets/. Correr desde mobile/:
//   node scripts/generar-iconos.mjs
//
// Dibuja las formas directamente (rectángulos, polígonos, cápsulas) con antialias por
// supermuestreo y las guarda con pngjs, que ya viene con Expo: no hace falta instalar nada.
// Todas las medidas están en un lienzo de 1024 × 1024.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const BLUE = [0x1e, 0x3a, 0x8a];
const WHITE = [0xff, 0xff, 0xff];
const RULE = [0x8a, 0x93, 0xa6];

// ---- Formas (devuelven si un punto está adentro) ----

/** La boleta: rectángulo con las esquinas de arriba redondeadas y el borde de abajo en zigzag. */
function ticket({ left = 262, right = 762, topY = 214, base = 790, teeth = 10, depth = 26, radius = 36 } = {}) {
  const step = (right - left) / teeth;
  return (x, y) => {
    if (x < left || x > right || y < topY) return false;
    // Esquinas redondeadas de arriba: afuera del cuarto de círculo de cada esquina, no es boleta.
    const cy = topY + radius;
    if (y < cy) {
      if (x < left + radius && (x - (left + radius)) ** 2 + (y - cy) ** 2 > radius ** 2) return false;
      if (x > right - radius && (x - (right - radius)) ** 2 + (y - cy) ** 2 > radius ** 2) return false;
    }
    // Borde de abajo: dientes en V entre base y base + depth.
    const t = (((x - left) % step) + step) % step;
    const bottom = base + depth * (1 - Math.abs(t - step / 2) / (step / 2));
    return y <= bottom;
  };
}

/** Polígono cualquiera (regla par-impar). */
function polygon(points) {
  return (x, y) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

/** La N: dos barras y la diagonal, como un solo contorno. */
function letterN(x0 = 392, y0 = 300, h = 300, s = 74) {
  const w = h * 0.86;
  return polygon([
    [x0, y0], [x0 + s, y0], [x0 + w - s, y0 + h * 0.62], [x0 + w - s, y0], [x0 + w, y0],
    [x0 + w, y0 + h], [x0 + w - s, y0 + h], [x0 + s, y0 + h * 0.38], [x0 + s, y0 + h], [x0, y0 + h],
  ]);
}

/** La línea punteada del troquel: cápsulas de 22 de largo cada 40. */
function perforation(from = 302, to = 722, y0 = 690, width = 10, dash = 22, gap = 18) {
  const r = width / 2;
  return (x, y) => {
    if (x < from - r || x > to + r || Math.abs(y - y0) > r) return false;
    const start = from + Math.floor((x - from) / (dash + gap)) * (dash + gap);
    const cx = Math.min(Math.max(x, start), start + dash);
    return (x - cx) ** 2 + (y - y0) ** 2 <= r * r;
  };
}

/** Cuadrado con esquinas redondeadas (para el ícono de la pantalla de inicio de la app). */
function roundedSquare(size, radius) {
  return (x, y) => {
    if (x < 0 || y < 0 || x > size || y > size) return false;
    const cx = Math.min(Math.max(x, radius), size - radius);
    const cy = Math.min(Math.max(y, radius), size - radius);
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius;
  };
}

// ---- Dibujo ----

/**
 * Dibuja capas en orden. Cada capa: { shape, color } o { shape, erase: true } (deja transparente).
 * `scale` achica el dibujo alrededor del centro (para la zona segura de Android).
 */
function render(size, layers, { scale = 1, samples = 4, opaque = false } = {}) {
  const png = new PNG({ width: size, height: size });
  const k = 1024 / size;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          // Punto de la muestra en el lienzo de 1024, deshaciendo la escala alrededor del centro.
          const x = 512 + (((px + (sx + 0.5) / samples) * k) - 512) / scale;
          const y = 512 + (((py + (sy + 0.5) / samples) * k) - 512) / scale;
          let color = null;
          for (const layer of layers) {
            if (layer.shape(x, y)) color = layer.erase ? null : layer.color;
          }
          if (color) {
            r += color[0]; g += color[1]; b += color[2]; a += 1;
          }
        }
      }
      const i = (py * size + px) * 4;
      const n = samples * samples;
      // Color promedio de las muestras cubiertas; alfa = proporción cubierta.
      png.data[i] = a ? Math.round(r / a) : 0;
      png.data[i + 1] = a ? Math.round(g / a) : 0;
      png.data[i + 2] = a ? Math.round(b / a) : 0;
      png.data[i + 3] = Math.round((a / n) * 255);
    }
  }
  // `opaque`: sin canal alfa (App Store rechaza el ícono si lo tiene, aunque sea todo opaco).
  return PNG.sync.write(png, opaque ? { colorType: 2, inputHasAlpha: true } : {});
}

const everywhere = () => true;
const talon = [
  { shape: ticket(), color: WHITE },
  { shape: letterN(), color: BLUE },
  { shape: perforation(), color: RULE },
];

const out = (name, data) => {
  writeFileSync(new URL(`../assets/${name}`, import.meta.url), data);
  console.log(`assets/${name}`);
};

// iOS y tiendas: cuadrado lleno (el sistema redondea las esquinas; no admite transparencia).
out('icon.png', render(1024, [{ shape: everywhere, color: BLUE }, ...talon], { opaque: true }));

// Android: el fondo azul es un color en app.json; el frente va achicado al 75% para que la boleta
// entre entera en el círculo de la zona segura (66 de 108 dp) aunque el teléfono recorte en círculo.
out('android-icon-foreground.png', render(1024, talon, { scale: 0.75 }));
// Monocromo (íconos temáticos de Android 13+): la boleta llena, con la N y el troquel calados.
out(
  'android-icon-monochrome.png',
  render(1024, [{ shape: ticket(), color: WHITE }, { shape: letterN(), erase: true }, { shape: perforation(), erase: true }], {
    scale: 0.75,
  }),
);

// Notificaciones de Android: silueta blanca sobre transparente (el sistema la pinta con el color de
// app.json). Más grande que el monocromo porque acá no hay recorte en círculo.
out(
  'notification-icon.png',
  render(96, [{ shape: ticket(), color: WHITE }, { shape: letterN(), erase: true }, { shape: perforation(), erase: true }], {
    scale: 1.3,
    samples: 8,
  }),
);

// Pantalla de carga: el ícono con esquinas redondeadas, sobre el fondo de la app.
out('splash-icon.png', render(1024, [{ shape: roundedSquare(1024, 230), color: BLUE }, ...talon], { samples: 3 }));

// Web.
out('favicon.png', render(48, [{ shape: everywhere, color: BLUE }, ...talon], { samples: 8 }));
