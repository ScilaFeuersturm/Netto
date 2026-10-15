/**
 * Fechas sin hora ni zona ("LocalDate") representadas como días desde 1970-01-01, igual que las
 * guardaba Room. Los cálculos se hacen en UTC para que no los afecten los cambios de horario.
 */
export type EpochDay = number;

/** Año y mes calendario ("YearMonth"), el mes va de 1 a 12. */
export type YearMonth = { year: number; month: number };

const MS_PER_DAY = 86_400_000;

export function epochDayOf(year: number, month: number, day: number): EpochDay {
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

/** Devuelve null si la fecha no existe (ej. 31/02). */
export function safeEpochDayOf(year: number, month: number, day: number): EpochDay | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return epochDayOf(year, month, day);
}

export function today(now: Date = new Date()): EpochDay {
  return epochDayOf(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function toParts(day: EpochDay): { year: number; month: number; day: number } {
  const d = new Date(day * MS_PER_DAY);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Como LocalDate.plusMonths: si el día no existe en el mes destino, usa el último día del mes. */
export function plusMonths(day: EpochDay, months: number): EpochDay {
  const { year, month, day: d } = toParts(day);
  const total = year * 12 + (month - 1) + months;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return epochDayOf(newYear, newMonth, Math.min(d, daysInMonth(newYear, newMonth)));
}

/** Fecha local (a medianoche, hora del dispositivo) para usar con selectores nativos. */
export function toLocalDate(day: EpochDay): Date {
  const { year, month, day: d } = toParts(day);
  return new Date(year, month - 1, d);
}

export function fromLocalDate(date: Date): EpochDay {
  return epochDayOf(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function yearMonthOf(day: EpochDay): YearMonth {
  const { year, month } = toParts(day);
  return { year, month };
}

export function currentYearMonth(): YearMonth {
  return yearMonthOf(today());
}

/** Clave ordenable y comparable de un mes (año * 12 + mes). */
export function ymKey(ym: YearMonth): number {
  return ym.year * 12 + (ym.month - 1);
}

export function ymFromKey(key: number): YearMonth {
  return { year: Math.floor(key / 12), month: (key % 12) + 1 };
}

export function sameYearMonth(day: EpochDay, ym: YearMonth): boolean {
  return ymKey(yearMonthOf(day)) === ymKey(ym);
}

const MONTHS_LONG = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sept', 'Oct', 'Nov', 'Dic'];

/** "14 Oct" */
export function shortEs(day: EpochDay): string {
  const { month, day: d } = toParts(day);
  return `${d} ${MONTHS_SHORT[month - 1]}`;
}

/** "Octubre 2024" */
export function longEs(ym: YearMonth): string {
  return `${MONTHS_LONG[ym.month - 1]} ${ym.year}`;
}

/** "09/10/2026" */
export function numericEs(day: EpochDay): string {
  const { year, month, day: d } = toParts(day);
  return `${String(d).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

/** "9 oct, 14:30" para marcas de tiempo (milisegundos). */
export function timestampEs(millis: number): string {
  const date = new Date(millis);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()].toLowerCase()}, ${hh}:${mm}`;
}
