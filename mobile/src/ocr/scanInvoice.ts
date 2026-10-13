import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { extractTextFromImage, isSupported } from 'expo-text-extractor';

import { parseInvoiceText, type InvoiceOcrResult } from './invoiceParser';

const MAX_DIMENSION = 2200;

/**
 * Lee el texto de una foto de factura 100% en el dispositivo (ML Kit en Android, Vision en iOS),
 * sin backend, consistente con el almacenamiento local de la app.
 * La imagen se re-codifica (lo que también aplica la rotación EXIF, que si no se corrige arruina
 * el reconocimiento de texto) y se limita su tamaño máximo.
 */
export async function scanInvoice(image: { uri: string; width: number; height: number }): Promise<{
  result: InvoiceOcrResult;
  imageUri: string;
}> {
  if (!isSupported) throw new Error('El reconocimiento de texto no está disponible en este dispositivo');
  const context = ImageManipulator.manipulate(image.uri);
  const largestSide = Math.max(image.width, image.height);
  if (largestSide > MAX_DIMENSION) {
    context.resize(image.width >= image.height ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
  const lines = await extractTextFromImage(saved.uri);
  return { result: parseInvoiceText(lines.join('\n')), imageUri: saved.uri };
}

/**
 * Puente en memoria (no persistido) entre la pantalla de escaneo y el formulario de obligación,
 * para no pasar datos grandes como parámetros de navegación.
 */
let pending: { result: InvoiceOcrResult; imageUri: string } | null = null;

export function setPendingScan(scan: { result: InvoiceOcrResult; imageUri: string }): void {
  pending = scan;
}

export function peekPendingScan(): { result: InvoiceOcrResult; imageUri: string } | null {
  return pending;
}

export function clearPendingScan(): void {
  pending = null;
}
