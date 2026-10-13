import Storage from 'expo-sqlite/kv-store';

import { CURRENCY_CODES, type CurrencyCode, type ExchangeRates } from '@/domain/currency';

import { notifyDataChanged } from './db';

/**
 * Cotizaciones (compartidas por todos los usuarios del dispositivo). Se descargan de ExchangeRate-API
 * (endpoint abierto, sin API key, se actualiza una vez por día), quedan guardadas para usarse sin conexión
 * y el usuario puede pisarlas a mano (ej. para usar el dólar blue o paralelo).
 */
export const RATES_SOURCE_NAME = 'ExchangeRate-API (open.er-api.com)';
const ENDPOINT = 'https://open.er-api.com/v6/latest/USD';
const TIMEOUT_MS = 10_000;
const STALE_AFTER_MS = 12 * 60 * 60 * 1000;

const UPDATED_AT_KEY = 'rates_updated_at';
const MANUAL_KEY = 'rates_manual';
const rateKey = (currency: CurrencyCode) => `rate_per_usd_${currency}`;

export function readRates(): ExchangeRates {
  const unitsPerUsd: ExchangeRates['unitsPerUsd'] = {};
  for (const currency of CURRENCY_CODES) {
    const value = Number(Storage.getItemSync(rateKey(currency)) ?? NaN);
    if (Number.isFinite(value) && value > 0) unitsPerUsd[currency] = value;
  }
  const updatedAt = Number(Storage.getItemSync(UPDATED_AT_KEY) ?? NaN);
  return {
    unitsPerUsd,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : null,
    isManual: Storage.getItemSync(MANUAL_KEY) === 'true',
  };
}

/** Unidades de cada moneda por 1 USD, según el servicio. */
async function fetchUnitsPerUsd(): Promise<Partial<Record<CurrencyCode, number>>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, { signal: controller.signal });
    if (!response.ok) throw new Error(`El servicio de cotizaciones respondió ${response.status}`);
    const json = await response.json();
    if (json?.result !== 'success') throw new Error('Respuesta inválida del servicio de cotizaciones');
    const result: Partial<Record<CurrencyCode, number>> = {};
    for (const currency of CURRENCY_CODES) {
      if (currency === 'USD') continue;
      const rate = Number(json.rates?.[currency]);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Falta la cotización de ${currency}`);
      result[currency] = rate;
    }
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

/** Descarga las cotizaciones oficiales y reemplaza las guardadas (incluidas las manuales). */
export async function refreshRates(): Promise<void> {
  const fetched = await fetchUnitsPerUsd();
  for (const [currency, rate] of Object.entries(fetched)) {
    await Storage.setItem(rateKey(currency as CurrencyCode), String(rate));
  }
  await Storage.setItem(UPDATED_AT_KEY, String(Date.now()));
  await Storage.setItem(MANUAL_KEY, 'false');
  notifyDataChanged();
}

/** Actualiza en segundo plano si nunca se descargaron o están viejas; respeta las manuales. */
export async function refreshRatesIfStale(): Promise<void> {
  const rates = readRates();
  if (rates.isManual) return;
  if (rates.updatedAt == null || Date.now() - rates.updatedAt > STALE_AFTER_MS) {
    await refreshRates().catch(() => {
      // Sin conexión: se siguen usando las guardadas.
    });
  }
}

export async function setManualRate(currency: CurrencyCode, unitsPerUsd: number): Promise<void> {
  if (currency === 'USD' || !(unitsPerUsd > 0)) throw new Error('Cotización inválida');
  await Storage.setItem(rateKey(currency), String(unitsPerUsd));
  await Storage.setItem(UPDATED_AT_KEY, String(Date.now()));
  await Storage.setItem(MANUAL_KEY, 'true');
  notifyDataChanged();
}
