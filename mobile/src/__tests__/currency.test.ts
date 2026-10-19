// Port de CurrencyTest.kt de la app Android.
import { CurrencyConverter, type ExchangeRates } from '@/domain/currency';
import { formatMoney, parseAmount, sanitizeAmountInput, spokenMoneyText, toAmountInput } from '@/domain/format';

const rates: ExchangeRates = { unitsPerUsd: { PYG: 7500, ARS: 1500 }, updatedAt: null, isManual: false };

test('convierte entre monedas usando unidades mínimas', () => {
  const toPyg = new CurrencyConverter('PYG', rates);
  // US$ 10,00 (1000 centavos) -> Gs. 75.000
  expect(toPyg.convert(1_000, 'USD')).toBe(75_000);
  // $ 1.500,00 (150000 centavos) -> 1 USD -> Gs. 7.500
  expect(toPyg.convert(150_000, 'ARS')).toBe(7_500);

  const toUsd = new CurrencyConverter('USD', rates);
  // Gs. 100.000 -> US$ 13,33 (redondeo a centavos)
  expect(toUsd.convert(100_000, 'PYG')).toBe(1_333);
});

test('la misma moneda no necesita cotización', () => {
  const converter = CurrencyConverter.identity('ARS');
  expect(converter.convert(12_345, 'ARS')).toBe(12_345);
  expect(converter.convert(100, 'PYG')).toBeNull();
});

test('la suma omite montos sin cotización', () => {
  const onlyPyg = new CurrencyConverter('PYG', { unitsPerUsd: { PYG: 7500 }, updatedAt: null, isManual: false });
  const items: [number, 'PYG' | 'USD' | 'ARS'][] = [
    [10_000, 'PYG'],
    [100, 'USD'],
    [999, 'ARS'],
  ];
  // ARS no tiene cotización: se omite. US$ 1,00 -> Gs. 7.500.
  expect(onlyPyg.sum(items, (it) => it[0], (it) => it[1])).toBe(17_500);
});

test('formatea cada moneda', () => {
  expect(formatMoney(350_000, 'PYG')).toBe('Gs. 350.000');
  expect(formatMoney(1_250, 'USD')).toBe('US$ 12,50');
  expect(formatMoney(150_000, 'ARS')).toBe('$ 1.500');
  expect(formatMoney(-1_000, 'PYG')).toBe('-Gs. 1.000');
});

test('interpreta lo que escribe el usuario', () => {
  expect(parseAmount('ARS', '1500,5')).toBe(150_050);
  expect(parseAmount('ARS', '1500')).toBe(150_000);
  expect(parseAmount('USD', '12.99')).toBe(1_299);
  expect(parseAmount('PYG', '350000')).toBe(350_000);
  expect(parseAmount('USD', '')).toBeNull();
  expect(sanitizeAmountInput('USD', '12,345')).toBe('12,34');
  expect(sanitizeAmountInput('PYG', '12,345')).toBe('12345');
});

test('el texto del monto ida y vuelta', () => {
  expect(toAmountInput(150_050, 'ARS')).toBe('1500,5');
  expect(toAmountInput(350_000, 'PYG')).toBe('350000');
  expect(toAmountInput(1_200, 'USD')).toBe('12');
});

describe('spokenMoneyText', () => {
  it('lee los montos con el nombre de la moneda y el signo en palabras', () => {
    expect(spokenMoneyText('Gs. 350.000')).toBe('350.000 guaraníes');
    expect(spokenMoneyText('-$ 1.200,50')).toBe('menos 1.200,50 pesos');
    expect(spokenMoneyText('+US$ 12')).toBe('más 12 dólares');
    expect(spokenMoneyText('Meta: Gs. 1.000.000 de Gs. 5.000.000')).toBe('Meta: 1.000.000 guaraníes de 5.000.000 guaraníes');
  });

  it('no toca textos sin montos', () => {
    expect(spokenMoneyText('Vence en 7 días')).toBeNull();
  });
});
