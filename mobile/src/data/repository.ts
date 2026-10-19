import { randomUUID } from 'expo-crypto';

import type { CurrencyCode } from '@/domain/currency';
import { plusMonths, today } from '@/domain/dates';
import {
  defaultBudgetPlan,
  type BudgetModelType,
  type BudgetPlan,
  type Income,
  type Obligation,
  type ObligationCategory,
  type PaymentHistoryEntry,
  type User,
} from '@/domain/models';
import { scheduleSync } from '@/sync/scheduler';

import { getDb, notifyDataChanged } from './db';
import { requireUserId } from './session';

/**
 * Lectura y escritura de los datos del usuario en la base local. Cada escritura marca la fila como
 * pendiente de subir (dirty) con la hora del cambio, y programa una sincronización. Los borrados son
 * lógicos (deleted = 1) para que lleguen a los demás dispositivos.
 */

function afterLocalWrite(): void {
  notifyDataChanged();
  scheduleSync();
}

// ---- Filas de SQLite (snake_case, booleanos 0/1) ↔ entidades ----

type ObligationRow = {
  id: string;
  user_id: string;
  name: string;
  reference: string | null;
  amount: number;
  currency: CurrencyCode;
  due_date: number;
  category: ObligationCategory;
  is_recurring: number;
  is_paid: number;
  paid_date: number | null;
  notes: string | null;
  created_from_ocr: number;
  created_on: number;
};

const toObligation = (r: ObligationRow): Obligation => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  reference: r.reference,
  amount: r.amount,
  currency: r.currency,
  dueDate: r.due_date,
  category: r.category,
  isRecurring: !!r.is_recurring,
  isPaid: !!r.is_paid,
  paidDate: r.paid_date,
  notes: r.notes,
  createdFromOcr: !!r.created_from_ocr,
  createdAt: r.created_on,
});

type IncomeRow = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  day_of_month: number;
  is_recurring: number;
};

const toIncome = (r: IncomeRow): Income => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  amount: r.amount,
  currency: r.currency,
  dayOfMonth: r.day_of_month,
  isRecurring: !!r.is_recurring,
});

type PaymentRow = {
  id: string;
  user_id: string;
  obligation_id: string;
  obligation_name: string;
  category: ObligationCategory;
  amount: number;
  currency: CurrencyCode;
  paid_date: number;
};

const toPayment = (r: PaymentRow): PaymentHistoryEntry => ({
  id: r.id,
  userId: r.user_id,
  obligationId: r.obligation_id,
  obligationName: r.obligation_name,
  category: r.category,
  amount: r.amount,
  currency: r.currency,
  paidDate: r.paid_date,
});

type BudgetPlanRow = {
  user_id: string;
  model_type: BudgetModelType;
  necesidades_percent: number;
  deseos_percent: number;
  ahorro_percent: number;
  reminder_days_before: number;
  display_currency: CurrencyCode;
  onboarding_completed: number;
};

const toBudgetPlan = (r: BudgetPlanRow): BudgetPlan => ({
  userId: r.user_id,
  modelType: r.model_type,
  necesidadesPercent: r.necesidades_percent,
  deseosPercent: r.deseos_percent,
  ahorroPercent: r.ahorro_percent,
  reminderDaysBefore: r.reminder_days_before,
  displayCurrency: r.display_currency,
  onboardingCompleted: !!r.onboarding_completed,
});

// ---- Perfil ----

export async function getUser(userId: string): Promise<User | null> {
  const row = await getDb().getFirstAsync<{ user_id: string; name: string; email: string }>(
    'SELECT user_id, name, email FROM profile WHERE user_id = ? AND deleted = 0',
    userId,
  );
  return row ? { id: row.user_id, name: row.name, email: row.email } : null;
}

/** Cambia el nombre visible; se sincroniza con los demás dispositivos como cualquier otro dato. */
export async function updateProfileName(name: string): Promise<void> {
  const userId = requireUserId();
  await getDb().runAsync(
    'UPDATE profile SET name = ?, updated_at = ?, dirty = 1 WHERE user_id = ?',
    name.trim(), Date.now(), userId,
  );
  afterLocalWrite();
}

// ---- Plan de presupuesto / preferencias por usuario ----

export async function getBudgetPlan(userId: string = requireUserId()): Promise<BudgetPlan | null> {
  const row = await getDb().getFirstAsync<BudgetPlanRow>(
    'SELECT * FROM budget_plan WHERE user_id = ? AND deleted = 0',
    userId,
  );
  return row ? toBudgetPlan(row) : null;
}

export async function saveBudgetPlan(plan: BudgetPlan): Promise<void> {
  const userId = requireUserId();
  await getDb().runAsync(
    `INSERT OR REPLACE INTO budget_plan
      (user_id, model_type, necesidades_percent, deseos_percent, ahorro_percent, reminder_days_before,
       display_currency, onboarding_completed, updated_at, deleted, dirty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
    userId, plan.modelType, plan.necesidadesPercent, plan.deseosPercent, plan.ahorroPercent,
    plan.reminderDaysBefore, plan.displayCurrency, plan.onboardingCompleted ? 1 : 0, Date.now(),
  );
  afterLocalWrite();
}

export async function updateBudgetPlan(transform: (plan: BudgetPlan) => BudgetPlan): Promise<void> {
  const userId = requireUserId();
  await saveBudgetPlan(transform((await getBudgetPlan(userId)) ?? defaultBudgetPlan(userId)));
}

export function selectBudgetModel(
  type: BudgetModelType,
  percents: { necesidadesPercent: number; deseosPercent: number; ahorroPercent: number },
): Promise<void> {
  return updateBudgetPlan((plan) => ({
    ...plan,
    modelType: type,
    necesidadesPercent: percents.necesidadesPercent,
    deseosPercent: percents.deseosPercent,
    ahorroPercent: percents.ahorroPercent,
  }));
}

export function setDisplayCurrency(currency: CurrencyCode): Promise<void> {
  return updateBudgetPlan((plan) => ({ ...plan, displayCurrency: currency }));
}

export function setReminderDaysBefore(days: number): Promise<void> {
  return updateBudgetPlan((plan) => ({ ...plan, reminderDaysBefore: days }));
}

// ---- Ingresos ----

export async function getIncomes(userId: string): Promise<Income[]> {
  const rows = await getDb().getAllAsync<IncomeRow>(
    'SELECT * FROM incomes WHERE user_id = ? AND deleted = 0 ORDER BY day_of_month ASC',
    userId,
  );
  return rows.map(toIncome);
}

export type NewIncome = Pick<Income, 'name' | 'amount' | 'currency'> & Partial<Pick<Income, 'dayOfMonth' | 'isRecurring'>>;

export async function addIncome(income: NewIncome): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO incomes (id, user_id, name, amount, currency, day_of_month, is_recurring, updated_at, deleted, dirty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
    randomUUID(), requireUserId(), income.name, income.amount, income.currency, income.dayOfMonth ?? 1,
    (income.isRecurring ?? true) ? 1 : 0, Date.now(),
  );
  afterLocalWrite();
}

export async function deleteIncome(id: string): Promise<void> {
  await getDb().runAsync(
    'UPDATE incomes SET deleted = 1, dirty = 1, updated_at = ? WHERE id = ? AND user_id = ?',
    Date.now(), id, requireUserId(),
  );
  afterLocalWrite();
}

// ---- Obligaciones e historial de pagos ----

export async function getObligations(userId: string): Promise<Obligation[]> {
  const rows = await getDb().getAllAsync<ObligationRow>(
    'SELECT * FROM obligations WHERE user_id = ? AND deleted = 0 ORDER BY is_paid ASC, due_date ASC',
    userId,
  );
  return rows.map(toObligation);
}

export async function getObligation(id: string): Promise<Obligation | null> {
  const row = await getDb().getFirstAsync<ObligationRow>(
    'SELECT * FROM obligations WHERE id = ? AND user_id = ? AND deleted = 0',
    id, requireUserId(),
  );
  return row ? toObligation(row) : null;
}

export type ObligationInput = {
  /** Vacío para crear una nueva. */
  id?: string;
  name: string;
  reference: string | null;
  amount: number;
  currency: CurrencyCode;
  dueDate: number;
  category: ObligationCategory;
  isRecurring: boolean;
  isPaid: boolean;
  paidDate: number | null;
  notes: string | null;
  createdFromOcr: boolean;
};

/** Crea la obligación, o la reemplaza si `id` ya existe. */
export async function saveObligation(input: ObligationInput): Promise<void> {
  const existing = input.id ? await getObligation(input.id) : null;
  await writeObligation(input, requireUserId(), existing?.createdAt ?? today());
  afterLocalWrite();
}

async function writeObligation(input: ObligationInput, userId: string, createdOn: number): Promise<void> {
  await getDb().runAsync(
    `INSERT OR REPLACE INTO obligations
      (id, user_id, name, reference, amount, currency, due_date, category, is_recurring, is_paid, paid_date, notes,
       created_from_ocr, created_on, updated_at, deleted, dirty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
    input.id || randomUUID(), userId, input.name, input.reference, input.amount, input.currency, input.dueDate,
    input.category, input.isRecurring ? 1 : 0, input.isPaid ? 1 : 0, input.paidDate, input.notes,
    input.createdFromOcr ? 1 : 0, createdOn, Date.now(),
  );
}

export async function deleteObligation(id: string): Promise<void> {
  await getDb().runAsync(
    'UPDATE obligations SET deleted = 1, dirty = 1, updated_at = ? WHERE id = ? AND user_id = ?',
    Date.now(), id, requireUserId(),
  );
  afterLocalWrite();
}

export async function getPaymentHistory(userId: string): Promise<PaymentHistoryEntry[]> {
  const rows = await getDb().getAllAsync<PaymentRow>(
    'SELECT * FROM payment_history WHERE user_id = ? AND deleted = 0 ORDER BY paid_date DESC',
    userId,
  );
  return rows.map(toPayment);
}

/** Marca una obligación como pagada, registra el historial y, si es recurrente, genera la próxima cuota. */
export async function markAsPaid(obligation: Obligation, paidDate: number = today()): Promise<void> {
  const db = getDb();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE obligations SET is_paid = 1, paid_date = ?, updated_at = ?, dirty = 1 WHERE id = ? AND user_id = ?',
      paidDate, now, obligation.id, obligation.userId,
    );
    await db.runAsync(
      `INSERT INTO payment_history
        (id, user_id, obligation_id, obligation_name, category, amount, currency, paid_date, updated_at, deleted, dirty)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
      randomUUID(), obligation.userId, obligation.id, obligation.name, obligation.category, obligation.amount,
      obligation.currency, paidDate, now,
    );
    if (obligation.isRecurring) {
      await writeObligation(
        {
          ...obligation,
          id: undefined,
          dueDate: plusMonths(obligation.dueDate, 1),
          isPaid: false,
          paidDate: null,
          createdFromOcr: false,
        },
        obligation.userId,
        obligation.createdAt,
      );
    }
  });
  afterLocalWrite();
}
