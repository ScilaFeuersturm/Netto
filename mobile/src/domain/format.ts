import { Currencies, type CurrencyCode } from './currency';

// Formato rioplatense/paraguayo: "." para miles y "," para decimales.

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Solo el número con separador de miles ("350.000", "12,50"), para montos donde el símbolo se muestra aparte.
 * Los centavos se muestran solo si no son cero.
 */
export function formatAmount(amount: number, currency: CurrencyCode): string {
  const { decimals } = Currencies[currency];
  const abs = Math.abs(Math.trunc(amount));
  if (decimals === 0) return groupThousands(String(abs));
  const scale = 10 ** decimals;
  const integer = Math.floor(abs / scale);
  const fraction = abs % scale;
  const integerText = groupThousands(String(integer));
  return fraction === 0 ? integerText : `${integerText},${String(fraction).padStart(decimals, '0')}`;
}

/** "Gs. 350.000", "US$ 12,50", "-$ 1.200". */
export function formatMoney(amount: number, currency: CurrencyCode): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${Currencies[currency].symbol} ${formatAmount(amount, currency)}`;
}

/** Filtra lo que el usuario escribe en un campo de monto: dígitos y, si la moneda tiene decimales, una coma. */
export function sanitizeAmountInput(currency: CurrencyCode, raw: string): string {
  const { decimals } = Currencies[currency];
  if (decimals === 0) return raw.replace(/\D/g, '');
  const normalized = raw.replace(/\./g, ',').replace(/[^\d,]/g, '');
  const commaIndex = normalized.indexOf(',');
  if (commaIndex < 0) return normalized;
  const integerPart = normalized.substring(0, commaIndex);
  const fraction = normalized.substring(commaIndex + 1).replace(/\D/g, '').substring(0, decimals);
  return `${integerPart},${fraction}`;
}

/** Convierte el texto de un campo de monto ("1500,5") a unidad mínima de la moneda (150050). */
export function parseAmount(currency: CurrencyCode, text: string): number | null {
  const { decimals } = Currencies[currency];
  const clean = sanitizeAmountInput(currency, text).replace(/,+$/, '');
  if (clean.length === 0) return null;
  const [integerPart, fraction = ''] = clean.split(',');
  const value = Number(integerPart || '0') * 10 ** decimals + Number(fraction.padEnd(decimals, '0') || '0');
  return Number.isSafeInteger(value) ? value : null;
}

/** Inverso de `parseAmount`, para precargar el campo al editar. */
export function toAmountInput(amount: number, currency: CurrencyCode): string {
  const { decimals } = Currencies[currency];
  if (decimals === 0) return String(amount);
  const scale = 10 ** decimals;
  const integer = Math.trunc(amount / scale);
  const fraction = String(Math.abs(amount % scale)).padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${integer},${fraction}` : String(integer);
}

/** Cotización (unidades por USD) formateada en la moneda: "Gs. 7.850", "$ 1.450,50". */
export function formatRate(rate: number, currency: CurrencyCode): string {
  const minor = Math.round(rate * 10 ** Currencies[currency].decimals);
  return formatMoney(minor, currency);
}

/** Para precargar el diálogo de edición de cotización: "1450,5". */
export function rateToInput(rate: number): string {
  return String(Number(rate.toPrecision(15))).replace('.', ',');
}

/** "1.450,50" o "1450,5" → 1450.5. Devuelve null si no es un número positivo. */
export function parseRateInput(text: string): number | null {
  const value = Number(text.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) && value > 0 && text.trim() !== '' ? value : null;
}

const SPOKEN_CURRENCY: Record<string, string> = { 'Gs.': 'guaraníes', 'US$': 'dólares', $: 'pesos' };
const MONEY_IN_TEXT = /([+-]?)(Gs\.|US\$|\$) ?(\d[\d.]*(?:,\d+)?)/g;

/**
 * Cómo tiene que leer un monto el lector de pantalla: "Gs. 350.000" se lee "G S 350.000" y
 * "-$ 1.200" pierde el signo. Devuelve "350.000 guaraníes", "menos 1.200 pesos".
 * Devuelve null si el texto no tiene montos, para no cambiar nada.
 */
export function spokenMoneyText(text: string): string | null {
  if (!text.match(MONEY_IN_TEXT)) return null;
  return text.replace(MONEY_IN_TEXT, (_, sign: string, symbol: string, number: string) => {
    const signWord = sign === '-' ? 'menos ' : sign === '+' ? 'más ' : '';
    return `${signWord}${number} ${SPOKEN_CURRENCY[symbol]}`;
  });
}
