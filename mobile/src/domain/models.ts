import type { CurrencyCode } from './currency';
import type { EpochDay } from './dates';

/**
 * Modelos de ahorro/gasto sugeridos, basados en reglas de finanzas personales
 * de uso extendido. Los porcentajes son sobre el ingreso mensual total.
 */
export type BudgetModelType = 'RULE_50_30_20' | 'RULE_70_20_10' | 'PAY_YOURSELF_FIRST' | 'CUSTOM';

export type BudgetModel = {
  type: BudgetModelType;
  title: string;
  description: string;
  source: string;
  necesidadesPercent: number;
  deseosPercent: number;
  ahorroPercent: number;
};

export const BUDGET_MODELS: BudgetModel[] = [
  {
    type: 'RULE_50_30_20',
    title: 'Regla 50/30/20',
    description:
      '50% para necesidades, 30% para deseos y 20% para ahorro o pago de deudas. ' +
      'Un buen punto de partida equilibrado para la mayoría de los ingresos.',
    source: 'Popularizada por la senadora Elizabeth Warren en "All Your Worth" (2005)',
    necesidadesPercent: 50,
    deseosPercent: 30,
    ahorroPercent: 20,
  },
  {
    type: 'RULE_70_20_10',
    title: 'Regla 70/20/10',
    description:
      '70% para gastos del día a día, 20% para ahorro y 10% para inversión o donación. ' +
      'Recomendada cuando los gastos fijos son altos en relación al ingreso.',
    source: 'Variante clásica de presupuesto proporcional usada en educación financiera',
    necesidadesPercent: 70,
    deseosPercent: 20,
    ahorroPercent: 10,
  },
  {
    type: 'PAY_YOURSELF_FIRST',
    title: 'Ahorro del 10% primero',
    description:
      'Separá el 10% de tu ingreso apenas lo recibís, antes de gastar en cualquier otra cosa. ' +
      'El resto (90%) se reparte libremente entre necesidades y deseos.',
    source: '"Pay yourself first", principio de George S. Clason en "El hombre más rico de Babilonia" (1926)',
    necesidadesPercent: 60,
    deseosPercent: 30,
    ahorroPercent: 10,
  },
  {
    type: 'CUSTOM',
    title: 'Personalizado',
    description: 'Definí vos los porcentajes de necesidades, deseos y ahorro según tu realidad.',
    source: 'Definido por vos',
    necesidadesPercent: 50,
    deseosPercent: 30,
    ahorroPercent: 20,
  },
];

export function budgetModel(type: BudgetModelType): BudgetModel {
  return BUDGET_MODELS.find((m) => m.type === type) ?? BUDGET_MODELS[0];
}

export type BudgetBucket = 'NECESIDADES' | 'DESEOS' | 'AHORRO';

/**
 * Categorías de obligaciones/gastos. `bucket` indica si financieramente es una necesidad o un deseo,
 * usado para calcular el progreso contra los modelos de presupuesto (50/30/20, etc).
 * `icon` es un nombre de MaterialIcons.
 */
export type ObligationCategory =
  | 'SERVICIOS' | 'INTERNET' | 'VIVIENDA' | 'EDUCACION' | 'SALUD' | 'TRANSPORTE'
  | 'ALIMENTACION' | 'DEUDAS' | 'MASCOTAS' | 'OCIO' | 'OTROS';

export type CategoryInfo = { label: string; icon: string; bucket: BudgetBucket };

export const CATEGORIES: Record<ObligationCategory, CategoryInfo> = {
  SERVICIOS: { label: 'Servicios (luz, agua, gas)', icon: 'bolt', bucket: 'NECESIDADES' },
  INTERNET: { label: 'Internet / Telefonía', icon: 'wifi', bucket: 'NECESIDADES' },
  VIVIENDA: { label: 'Vivienda / Alquiler', icon: 'home', bucket: 'NECESIDADES' },
  EDUCACION: { label: 'Educación', icon: 'school', bucket: 'NECESIDADES' },
  SALUD: { label: 'Salud', icon: 'local-hospital', bucket: 'NECESIDADES' },
  TRANSPORTE: { label: 'Transporte', icon: 'directions-car', bucket: 'NECESIDADES' },
  ALIMENTACION: { label: 'Alimentación', icon: 'fastfood', bucket: 'NECESIDADES' },
  DEUDAS: { label: 'Deudas / Préstamos', icon: 'favorite', bucket: 'NECESIDADES' },
  MASCOTAS: { label: 'Mascotas', icon: 'pets', bucket: 'DESEOS' },
  OCIO: { label: 'Ocio / Entretenimiento', icon: 'sports-esports', bucket: 'DESEOS' },
  OTROS: { label: 'Otros', icon: 'more-horiz', bucket: 'DESEOS' },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as ObligationCategory[];

/** Estado calculado de una obligación en base a su fecha de vencimiento y si fue pagada. */
export type ObligationStatus = 'PAGADO' | 'VENCIDO' | 'HOY' | 'PROXIMO' | 'AL_DIA';

export const STATUS_LABELS: Record<ObligationStatus, string> = {
  PAGADO: 'Pagado',
  VENCIDO: 'Vencido',
  HOY: 'Vence hoy',
  PROXIMO: 'Próximo',
  AL_DIA: 'Al día',
};

/** `proximoUmbralDias` es cuántos días antes del vencimiento se considera "próximo". */
export function obligationStatus(
  dueDate: EpochDay,
  isPaid: boolean,
  today: EpochDay,
  proximoUmbralDias = 7,
): ObligationStatus {
  if (isPaid) return 'PAGADO';
  const diasHastaVencimiento = dueDate - today;
  if (diasHastaVencimiento < 0) return 'VENCIDO';
  if (diasHastaVencimiento === 0) return 'HOY';
  if (diasHastaVencimiento <= proximoUmbralDias) return 'PROXIMO';
  return 'AL_DIA';
}

/** Texto corto del vencimiento para chips: "Vence en 2 días", "Vence mañana", "Vencida hace 3 días". */
export function dueLabel(dueDate: EpochDay, status: ObligationStatus, today: EpochDay): string {
  if (status === 'PAGADO') return 'Pagada';
  const days = dueDate - today;
  if (days < -1) return `Vencida hace ${-days} días`;
  if (days === -1) return 'Vencida ayer';
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence en ${days} días`;
}

/** Qué tan cerca está el vencimiento, de 0 (lejos) a 1 (vence hoy o vencida). Ventana de 30 días. */
export function urgencyFraction(dueDate: EpochDay, isPaid: boolean, today: EpochDay): number {
  if (isPaid) return 1;
  const days = dueDate - today;
  return Math.min(1, Math.max(0.06, 1 - days / 30));
}

// ---- Entidades persistidas ----

/** Usuario con sesión abierta. La cuenta vive en Supabase; acá queda una copia del perfil. */
export type User = {
  id: string;
  name: string;
  email: string;
};

/** Una obligación de pago: factura de servicio, cuota, gasto recurrente, etc. `amount` está en unidad mínima de `currency`. */
export type Obligation = {
  id: string;
  userId: string;
  name: string;
  reference: string | null;
  amount: number;
  currency: CurrencyCode;
  dueDate: EpochDay;
  category: ObligationCategory;
  isRecurring: boolean;
  isPaid: boolean;
  paidDate: EpochDay | null;
  notes: string | null;
  createdFromOcr: boolean;
  createdAt: EpochDay;
  /** Grupo del plan familiar con el que está compartido; null si es privado. */
  householdId: string | null;
};

/** Una fuente de ingreso mensual (sueldo, freelance, renta, etc). `amount` está en unidad mínima de `currency`. */
export type Income = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  dayOfMonth: number;
  isRecurring: boolean;
  /** Grupo del plan familiar con el que está compartido; null si es privado. */
  householdId: string | null;
};

/** Registro histórico de un pago realizado, conservado aunque la obligación original cambie. */
export type PaymentHistoryEntry = {
  id: string;
  userId: string;
  obligationId: string;
  obligationName: string;
  category: ObligationCategory;
  amount: number;
  currency: CurrencyCode;
  paidDate: EpochDay;
  /** Grupo del plan familiar con el que está compartido; null si es privado. */
  householdId: string | null;
};

/** Preferencias de cada usuario (una fila por usuario): modelo de ahorro/gasto activo y moneda de visualización. */
export type BudgetPlan = {
  userId: string;
  modelType: BudgetModelType;
  necesidadesPercent: number;
  deseosPercent: number;
  ahorroPercent: number;
  reminderDaysBefore: number;
  /** Moneda en la que se muestran los totales; cada monto conserva su moneda original. */
  displayCurrency: CurrencyCode;
  onboardingCompleted: boolean;
};

/** Con cuántos días de anticipación llega el primer aviso de una factura (se cambia en el perfil). */
export const DEFAULT_REMINDER_DAYS = 5;
export const REMINDER_DAY_OPTIONS = [1, 2, 3, 5, 7, 10] as const;

export function defaultBudgetPlan(userId = ''): BudgetPlan {
  const model = budgetModel('RULE_50_30_20');
  return {
    userId,
    modelType: model.type,
    necesidadesPercent: model.necesidadesPercent,
    deseosPercent: model.deseosPercent,
    ahorroPercent: model.ahorroPercent,
    reminderDaysBefore: DEFAULT_REMINDER_DAYS,
    displayCurrency: 'PYG',
    onboardingCompleted: false,
  };
}
