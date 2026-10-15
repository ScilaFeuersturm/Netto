import { safeEpochDayOf, today as todayFn, type EpochDay } from '@/domain/dates';

export type InvoiceOcrResult = {
  rawText: string;
  suggestedAmount: number | null;
  suggestedDueDate: EpochDay | null;
};

/** Extrae monto a pagar y fecha de vencimiento del texto leído de una factura. */
export function parseInvoiceText(text: string, today: EpochDay = todayFn()): InvoiceOcrResult {
  return {
    rawText: text,
    suggestedAmount: extractAmount(text),
    suggestedDueDate: extractDueDate(text, today),
  };
}

const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};
const MONTH_NAMES = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre';
const DATE_KEYWORDS = 'fecha\\s*de\\s*vencimiento|vencimiento|vence\\s*el|pagar\\s*hasta|válido\\s*hasta';

// Montos con separador de miles ("." en formato paraguayo), ej. 1.045.000
const THOUSANDS_REGEX = /\d{1,3}(?:\.\d{3})+/g;
const PLAIN_DIGITS_REGEX = /\b\d{5,9}\b/g;
const AMOUNT_KEYWORD_REGEX = new RegExp(
  '(total\\s*a\\s*pagar|monto\\s*a\\s*pagar|importe\\s*total|importe\\s*a\\s*pagar|' +
    'saldo\\s*a\\s*pagar|a\\s*pagar|total\\s*:?|monto\\s*:?|importe\\s*:?)[^\\d]{0,20}(\\d[\\d.,]{3,})',
  'gi',
);

const NUMERIC_DATE_REGEX = /\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}/g;
const DATE_KEYWORD_REGEX = new RegExp(`(${DATE_KEYWORDS})[^\\d]{0,20}(\\d{1,2}[/.\\-]\\d{1,2}[/.\\-]\\d{2,4})`, 'i');
const TEXT_MONTH_DATE_SOURCE = `(\\d{1,2})\\s*(?:de)?\\s*(${MONTH_NAMES})\\s*(?:de|del)?\\s*(\\d{4})`;
const TEXT_MONTH_DATE_REGEX = new RegExp(TEXT_MONTH_DATE_SOURCE, 'gi');
const DATE_KEYWORD_TEXT_MONTH_REGEX = new RegExp(
  `(${DATE_KEYWORDS})[^\\d]{0,10}(\\d{1,2}\\s*(?:de)?\\s*(?:${MONTH_NAMES})\\s*(?:de|del)?\\s*\\d{4})`,
  'i',
);

function toAmountOrNull(raw: string): number | null {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 4 && digits.length <= 12 ? Number(digits) : null;
}

function extractAmount(text: string): number | null {
  // 1) Buscamos cerca de una palabra clave típica de "monto a pagar".
  for (const match of text.matchAll(AMOUNT_KEYWORD_REGEX)) {
    const amount = toAmountOrNull(match[2]);
    if (amount != null) return amount;
  }

  // 2) Si no hay palabra clave, nos quedamos con el número más grande con separador de miles
  //    (los importes suelen ser el valor más alto de la factura; NIS/cuentas suelen ser más chicos
  //    o no llevan puntos de miles reales).
  const withSeparators = [...text.matchAll(THOUSANDS_REGEX)]
    .map((m) => toAmountOrNull(m[0]))
    .filter((n): n is number => n != null);
  if (withSeparators.length > 0) return Math.max(...withSeparators);

  // 3) Último recurso: una tira de 5 a 9 dígitos sueltos (monto sin separador de miles).
  const plain = [...text.matchAll(PLAIN_DIGITS_REGEX)].map((m) => Number(m[0]));
  return plain.length > 0 ? Math.max(...plain) : null;
}

function parseNumericDate(raw: string): EpochDay | null {
  const parts = raw.replace(/[.\-]/g, '/').split('/');
  if (parts.length !== 3) return null;
  const [day, month, rawYear] = parts.map(Number);
  const year = rawYear < 100 ? rawYear + 2000 : rawYear;
  return safeEpochDayOf(year, month, day);
}

function parseTextMonthDate(raw: string): EpochDay | null {
  const match = new RegExp(TEXT_MONTH_DATE_SOURCE, 'i').exec(raw);
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  if (!month) return null;
  return safeEpochDayOf(Number(match[3]), month, Number(match[1]));
}

function extractDueDate(text: string, today: EpochDay): EpochDay | null {
  const keywordMatch = DATE_KEYWORD_REGEX.exec(text)?.[2];
  const fromKeyword = keywordMatch ? parseNumericDate(keywordMatch) : null;
  if (fromKeyword != null) return fromKeyword;

  const keywordTextMonth = DATE_KEYWORD_TEXT_MONTH_REGEX.exec(text)?.[2];
  const fromTextKeyword = keywordTextMonth ? parseTextMonthDate(keywordTextMonth) : null;
  if (fromTextKeyword != null) return fromTextKeyword;

  const dates = [
    ...[...text.matchAll(NUMERIC_DATE_REGEX)].map((m) => parseNumericDate(m[0])),
    ...[...text.matchAll(TEXT_MONTH_DATE_REGEX)].map((m) => parseTextMonthDate(m[0])),
  ].filter((d): d is EpochDay => d != null);
  if (dates.length === 0) return null;
  const upcoming = dates.filter((d) => d >= today);
  return upcoming.length > 0 ? Math.min(...upcoming) : Math.max(...dates);
}
