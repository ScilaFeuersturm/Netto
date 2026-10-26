/**
 * Monedas soportadas. Los montos se guardan como enteros en la unidad mínima de cada moneda
 * (guaraníes enteros; centavos para pesos y dólares), por eso `decimals` define la escala.
 */
export type CurrencyCode = 'PYG' | 'ARS' | 'USD';

export type Currency = {
  code: CurrencyCode;
  symbol: string;
  label: string;
  decimals: number;
};

export const Currencies: Record<CurrencyCode, Currency> = {
  PYG: { code: 'PYG', symbol: 'Gs.', label: 'Guaraníes', decimals: 0 },
  ARS: { code: 'ARS', symbol: '$', label: 'Pesos argentinos', decimals: 2 },
  USD: { code: 'USD', symbol: 'US$', label: 'Dólares', decimals: 2 },
};

/**
 * Países donde está Inariko. En el plan gratis se usa solo la moneda del país elegido al empezar;
 * las demás monedas (y las cotizaciones) son Premium.
 */
export const COUNTRIES = [
  { code: 'AR', name: 'Argentina', currency: 'ARS' },
  { code: 'PY', name: 'Paraguay', currency: 'PYG' },
] as const satisfies readonly { code: string; name: string; currency: CurrencyCode }[];

/**
 * La moneda del país del teléfono, deducida de su zona horaria (no hace falta ningún permiso).
 * Devuelve null si no es Argentina ni Paraguay: ahí la persona elige.
 */
export function guessLocalCurrency(timeZone: string | undefined = currentTimeZone()): CurrencyCode | null {
  if (!timeZone) return null;
  if (timeZone === 'America/Asuncion') return 'PYG';
  if (timeZone.startsWith('America/Argentina/') || timeZone === 'America/Buenos_Aires') return 'ARS';
  return null;
}

function currentTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/** En el mismo orden que el enum original (es el orden de los selectores). */
export const CURRENCY_CODES: CurrencyCode[] = ['PYG', 'ARS', 'USD'];

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && value in Currencies;
}

/**
 * Cotizaciones expresadas como "unidades de la moneda por 1 dólar" (USD es siempre 1).
 * Una moneda sin cotización conocida no está en `unitsPerUsd`.
 */
export type ExchangeRates = {
  unitsPerUsd: Partial<Record<CurrencyCode, number>>;
  /** Milisegundos de la última actualización, o null si nunca se descargaron. */
  updatedAt: number | null;
  /** true si el usuario editó a mano alguna cotización (ej. dólar blue) después de la última descarga. */
  isManual: boolean;
};

export const EMPTY_RATES: ExchangeRates = { unitsPerUsd: {}, updatedAt: null, isManual: false };

export function rateOf(rates: ExchangeRates, currency: CurrencyCode): number | null {
  if (currency === 'USD') return 1;
  return rates.unitsPerUsd[currency] ?? null;
}

export function hasRate(rates: ExchangeRates, currency: CurrencyCode): boolean {
  return rateOf(rates, currency) != null;
}

/** Redondeo HALF_UP (lejos del cero), tolerante al error de punto flotante. */
function roundHalfUp(value: number): number {
  const clean = Number(value.toPrecision(15));
  return Math.sign(clean) * Math.round(Math.abs(clean));
}

/** Convierte montos (en unidad mínima) a la moneda de visualización `target`. */
export class CurrencyConverter {
  constructor(
    readonly target: CurrencyCode,
    readonly rates: ExchangeRates,
  ) {}

  static identity(target: CurrencyCode): CurrencyConverter {
    return new CurrencyConverter(target, EMPTY_RATES);
  }

  /** Devuelve null si falta la cotización de alguna de las dos monedas. */
  convert(amount: number, from: CurrencyCode, to: CurrencyCode = this.target): number | null {
    if (from === to) return amount;
    const fromRate = rateOf(this.rates, from);
    const toRate = rateOf(this.rates, to);
    if (fromRate == null || toRate == null) return null;
    const value = amount / 10 ** Currencies[from].decimals;
    return roundHalfUp((value / fromRate) * toRate * 10 ** Currencies[to].decimals);
  }

  /** Suma montos en distintas monedas, convertidos a `target`. Los que no se pueden convertir se omiten. */
  sum<T>(items: readonly T[], amount: (item: T) => number, currency: (item: T) => CurrencyCode): number {
    return items.reduce((acc, item) => acc + (this.convert(amount(item), currency(item)) ?? 0), 0);
  }

  /** Atajo para listas de entidades con `amount` y `currency`. */
  sumOf(items: readonly { amount: number; currency: CurrencyCode }[]): number {
    return this.sum(items, (it) => it.amount, (it) => it.currency);
  }
}
