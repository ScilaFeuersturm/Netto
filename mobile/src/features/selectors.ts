/**
 * Cálculos de cada pantalla (lo que hacían los ViewModels en Android), como funciones puras sobre
 * los datos del usuario para poder testearlos sin base de datos.
 */
import { CURRENCY_CODES, hasRate, type CurrencyCode, type CurrencyConverter } from '@/domain/currency';
import {
  sameYearMonth, today as todayFn, yearMonthOf, ymFromKey, ymKey, type EpochDay, type YearMonth,
} from '@/domain/dates';
import {
  CATEGORIES,
  obligationStatus,
  type BudgetPlan,
  type Income,
  type Obligation,
  type ObligationCategory,
  type ObligationStatus,
  type PaymentHistoryEntry,
  type User,
} from '@/domain/models';

export type UserData = {
  user: User | null;
  plan: BudgetPlan;
  obligations: Obligation[];
  incomes: Income[];
  history: PaymentHistoryEntry[];
  converter: CurrencyConverter;
};

// ---- Encabezado común a las pestañas ----

export type HeaderState = {
  firstName: string;
  initials: string;
  displayCurrency: CurrencyCode;
  /** Monedas cuya cotización hace falta para convertir los montos cargados y todavía no se conoce. */
  missingRates: CurrencyCode[];
};

export function initialsOf(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

export function headerState({ user, converter, obligations, incomes }: UserData): HeaderState {
  const name = user?.name ?? '';
  const foreign = new Set<CurrencyCode>([...obligations, ...incomes].map((it) => it.currency));
  foreign.delete(converter.target);
  const needed = foreign.size === 0 ? [] : [...foreign, converter.target];
  return {
    firstName: name.trim().split(' ')[0] ?? '',
    initials: initialsOf(name),
    displayCurrency: converter.target,
    missingRates: CURRENCY_CODES.filter((c) => needed.includes(c) && !hasRate(converter.rates, c)),
  };
}

// ---- Inicio ----

export type DashboardState = {
  userHasData: boolean;
  totalIncome: number;
  totalPending: number;
  pendingThisMonth: number;
  vencidosCount: number;
  proximosCount: number;
  alDiaCount: number;
  isOverBudget: boolean;
  overBudgetAmount: number;
  upcoming: Obligation[];
  /** Facturas sin pagar que vencen en los próximos 7 días (o ya vencidas). */
  dueThisWeekCount: number;
  /** Porcentaje (0-100) del monto de obligaciones de este mes que ya está pagado. */
  paidThisMonthPercent: number;
  recentPayments: PaymentHistoryEntry[];
  /** Lo que queda del ingreso mensual después de cubrir lo pendiente del mes. */
  availableBalance: number;
};

export function dashboardState(data: UserData, today: EpochDay = todayFn()): DashboardState {
  const { obligations, incomes, plan, history, converter } = data;
  const currentMonth = yearMonthOf(today);
  const reminderDays = plan.reminderDaysBefore;
  const unpaid = obligations.filter((o) => !o.isPaid);
  const statusOf = (o: Obligation) => obligationStatus(o.dueDate, false, today, reminderDays);

  const totalIncome = converter.sumOf(incomes);
  const pendingThisMonth = converter.sumOf(
    unpaid.filter((o) => sameYearMonth(o.dueDate, currentMonth) || statusOf(o) === 'VENCIDO'),
  );
  const thisMonth = obligations.filter((o) => sameYearMonth(o.dueDate, currentMonth));
  const thisMonthTotal = converter.sumOf(thisMonth);
  const thisMonthPaid = converter.sumOf(thisMonth.filter((o) => o.isPaid));

  return {
    userHasData: obligations.length > 0 || incomes.length > 0,
    totalIncome,
    totalPending: converter.sumOf(unpaid),
    pendingThisMonth,
    vencidosCount: unpaid.filter((o) => statusOf(o) === 'VENCIDO').length,
    proximosCount: unpaid.filter((o) => ['HOY', 'PROXIMO'].includes(statusOf(o))).length,
    alDiaCount: unpaid.filter((o) => statusOf(o) === 'AL_DIA').length,
    isOverBudget: totalIncome > 0 && pendingThisMonth > totalIncome,
    overBudgetAmount: Math.max(0, pendingThisMonth - totalIncome),
    upcoming: [...unpaid].sort((a, b) => a.dueDate - b.dueDate).slice(0, 6),
    dueThisWeekCount: unpaid.filter((o) => o.dueDate <= today + 7).length,
    paidThisMonthPercent: thisMonthTotal === 0 ? 0 : Math.trunc((thisMonthPaid * 100) / thisMonthTotal),
    recentPayments: [...history].sort((a, b) => b.paidDate - a.paidDate).slice(0, 3),
    availableBalance: totalIncome - pendingThisMonth,
  };
}

// ---- Facturas ----

export type ObligationFilter = 'TODOS' | 'VENCIDOS' | 'PROXIMOS' | 'AL_DIA' | 'PAGADOS';

export const OBLIGATION_FILTERS: { key: ObligationFilter; label: string }[] = [
  { key: 'TODOS', label: 'Todas' },
  { key: 'VENCIDOS', label: 'Vencidas' },
  { key: 'PROXIMOS', label: 'Por vencer' },
  { key: 'AL_DIA', label: 'Al día' },
  { key: 'PAGADOS', label: 'Pagadas' },
];

export function filterMatches(filter: ObligationFilter, status: ObligationStatus): boolean {
  switch (filter) {
    case 'TODOS': return true;
    case 'VENCIDOS': return status === 'VENCIDO';
    case 'PROXIMOS': return status === 'HOY' || status === 'PROXIMO';
    case 'AL_DIA': return status === 'AL_DIA';
    case 'PAGADOS': return status === 'PAGADO';
  }
}

export type ObligationsState = {
  items: { obligation: Obligation; status: ObligationStatus }[];
  counts: Record<ObligationFilter, number>;
  /** Sin pagar con vencimiento este mes o ya vencidas. */
  pendingThisMonth: number;
  activeCount: number;
  nextDue: Obligation | null;
};

export function obligationsState(data: UserData, filter: ObligationFilter, today: EpochDay = todayFn()): ObligationsState {
  const { obligations, converter } = data;
  const currentKey = ymKey(yearMonthOf(today));
  const all = obligations.map((obligation) => ({ obligation, status: obligationStatus(obligation.dueDate, obligation.isPaid, today) }));
  const unpaid = obligations.filter((o) => !o.isPaid);
  const counts = Object.fromEntries(
    OBLIGATION_FILTERS.map(({ key }) => [key, all.filter((it) => filterMatches(key, it.status)).length]),
  ) as Record<ObligationFilter, number>;
  return {
    items: all
      .filter((it) => filterMatches(filter, it.status))
      .sort((a, b) => Number(a.obligation.isPaid) - Number(b.obligation.isPaid) || a.obligation.dueDate - b.obligation.dueDate),
    counts,
    pendingThisMonth: converter.sumOf(unpaid.filter((o) => ymKey(yearMonthOf(o.dueDate)) <= currentKey)),
    activeCount: unpaid.length,
    nextDue: unpaid.reduce<Obligation | null>((min, o) => (min == null || o.dueDate < min.dueDate ? o : min), null),
  };
}

// ---- Ahorro ----

export type BudgetState = {
  totalIncome: number;
  necesidadesSpent: number;
  deseosSpent: number;
  ahorroReal: number;
  necesidadesAllocated: number;
  deseosAllocated: number;
  ahorroGoal: number;
};

export function budgetState(data: UserData, today: EpochDay = todayFn()): BudgetState {
  const { plan, obligations, incomes, converter } = data;
  const currentMonth = yearMonthOf(today);
  const thisMonth = obligations.filter((o) => sameYearMonth(o.dueDate, currentMonth));
  const totalIncome = converter.sumOf(incomes);
  const totalSpent = converter.sumOf(thisMonth);
  const share = (percent: number) => Math.trunc((totalIncome * percent) / 100);
  return {
    totalIncome,
    necesidadesSpent: converter.sumOf(thisMonth.filter((o) => CATEGORIES[o.category].bucket === 'NECESIDADES')),
    deseosSpent: converter.sumOf(thisMonth.filter((o) => CATEGORIES[o.category].bucket === 'DESEOS')),
    ahorroReal: Math.max(0, totalIncome - totalSpent),
    necesidadesAllocated: share(plan.necesidadesPercent),
    deseosAllocated: share(plan.deseosPercent),
    ahorroGoal: share(plan.ahorroPercent),
  };
}

// ---- Reportes ----

export type CategoryShare = { category: ObligationCategory; amount: number; percent: number };

export type ReportsState = {
  /** Meses con movimientos (más el actual), en orden cronológico. */
  months: YearMonth[];
  totalIncome: number;
  /** Obligaciones con vencimiento en el mes elegido, pagadas o no. */
  totalExpenses: number;
  paidExpenses: number;
  categories: CategoryShare[];
  payments: PaymentHistoryEntry[];
  netFlow: number;
  expensesPercentOfIncome: number;
  paidPercent: number;
};

export function reportsState(data: UserData, month: YearMonth, today: EpochDay = todayFn()): ReportsState {
  const { obligations, incomes, history, converter } = data;
  const inMonth = obligations.filter((o) => sameYearMonth(o.dueDate, month));
  const totalExpenses = converter.sumOf(inMonth);
  const grouped = new Map<ObligationCategory, Obligation[]>();
  inMonth.forEach((o) => grouped.set(o.category, [...(grouped.get(o.category) ?? []), o]));
  const categories = [...grouped.entries()]
    .map(([category, items]) => {
      const amount = converter.sumOf(items);
      return { category, amount, percent: totalExpenses === 0 ? 0 : Math.trunc((amount * 100) / totalExpenses) };
    })
    .sort((a, b) => b.amount - a.amount);

  const monthKeys = new Set<number>([
    ...obligations.map((o) => ymKey(yearMonthOf(o.dueDate))),
    ...history.map((h) => ymKey(yearMonthOf(h.paidDate))),
    ymKey(yearMonthOf(today)),
    ymKey(month),
  ]);
  const totalIncome = converter.sumOf(incomes);
  const paidExpenses = converter.sumOf(inMonth.filter((o) => o.isPaid));
  return {
    months: [...monthKeys].sort((a, b) => a - b).map(ymFromKey),
    totalIncome,
    totalExpenses,
    paidExpenses,
    categories,
    payments: history.filter((h) => sameYearMonth(h.paidDate, month)).sort((a, b) => b.paidDate - a.paidDate),
    netFlow: totalIncome - totalExpenses,
    expensesPercentOfIncome: totalIncome === 0 ? 0 : Math.trunc((totalExpenses * 100) / totalIncome),
    paidPercent: totalExpenses === 0 ? 0 : Math.trunc((paidExpenses * 100) / totalExpenses),
  };
}

// ---- Recordatorios ----

export type Reminder = { obligationId: string; date: EpochDay; title: string; body: string };

/**
 * Qué avisos programar para cada factura sin pagar: unos días antes (según el plan), el día del
 * vencimiento y al día siguiente si sigue impaga. Solo fechas desde hoy en adelante.
 */
export function remindersFor(
  obligations: Obligation[],
  reminderDaysBefore: number,
  describe: (o: Obligation) => string,
  today: EpochDay = todayFn(),
): Reminder[] {
  const reminders: Reminder[] = [];
  for (const o of obligations) {
    if (o.isPaid) continue;
    const body = describe(o);
    const candidates: [EpochDay, string][] = [
      [o.dueDate - reminderDaysBefore, `${o.name} vence pronto`],
      [o.dueDate, `${o.name} vence hoy`],
      [o.dueDate + 1, `${o.name} está vencido`],
    ];
    for (const [date, title] of candidates) {
      if (date >= today) reminders.push({ obligationId: o.id, date, title, body });
    }
  }
  return reminders.sort((a, b) => a.date - b.date);
}
