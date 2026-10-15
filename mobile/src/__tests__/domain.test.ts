import { CurrencyConverter } from '@/domain/currency';
import { epochDayOf, plusMonths, shortEs, toParts } from '@/domain/dates';
import { defaultBudgetPlan, dueLabel, obligationStatus, type Obligation } from '@/domain/models';
import { budgetState, dashboardState, remindersFor, reportsState, type UserData } from '@/features/selectors';
import { parseInvoiceText } from '@/ocr/invoiceParser';

const TODAY = epochDayOf(2026, 10, 9);

function obligation(partial: Partial<Obligation>): Obligation {
  return {
    id: 'o1',
    userId: 'u1',
    name: 'Luz',
    reference: null,
    amount: 100_000,
    currency: 'PYG',
    dueDate: TODAY,
    category: 'SERVICIOS',
    isRecurring: false,
    isPaid: false,
    paidDate: null,
    notes: null,
    createdFromOcr: false,
    createdAt: TODAY,
    ...partial,
  };
}

function data(partial: Partial<UserData>): UserData {
  return {
    user: null,
    plan: { ...defaultBudgetPlan('u1'), onboardingCompleted: true },
    obligations: [],
    incomes: [],
    history: [],
    converter: CurrencyConverter.identity('PYG'),
    ...partial,
  };
}

describe('fechas', () => {
  test('plusMonths usa el último día si el mes destino es más corto', () => {
    expect(toParts(plusMonths(epochDayOf(2026, 1, 31), 1))).toEqual({ year: 2026, month: 2, day: 28 });
    expect(toParts(plusMonths(epochDayOf(2026, 12, 15), 1))).toEqual({ year: 2027, month: 1, day: 15 });
  });

  test('formato corto en español', () => {
    expect(shortEs(epochDayOf(2026, 10, 14))).toBe('14 Oct');
  });
});

describe('estado de obligaciones', () => {
  test('calcula el estado según el vencimiento', () => {
    expect(obligationStatus(TODAY - 1, false, TODAY)).toBe('VENCIDO');
    expect(obligationStatus(TODAY, false, TODAY)).toBe('HOY');
    expect(obligationStatus(TODAY + 7, false, TODAY)).toBe('PROXIMO');
    expect(obligationStatus(TODAY + 8, false, TODAY)).toBe('AL_DIA');
    expect(obligationStatus(TODAY - 5, true, TODAY)).toBe('PAGADO');
  });

  test('textos de vencimiento', () => {
    expect(dueLabel(TODAY - 3, 'VENCIDO', TODAY)).toBe('Vencida hace 3 días');
    expect(dueLabel(TODAY - 1, 'VENCIDO', TODAY)).toBe('Vencida ayer');
    expect(dueLabel(TODAY + 1, 'PROXIMO', TODAY)).toBe('Vence mañana');
    expect(dueLabel(TODAY + 2, 'PROXIMO', TODAY)).toBe('Vence en 2 días');
  });
});

describe('cálculos de pantallas', () => {
  const incomes = [{ id: 'o1', userId: 'u1', name: 'Sueldo', amount: 1_000_000, currency: 'PYG' as const, dayOfMonth: 1, isRecurring: true }];

  test('inicio: saldo disponible y vencidas', () => {
    const state = dashboardState(
      data({
        incomes,
        obligations: [
          obligation({ id: 'o1', dueDate: TODAY - 2, amount: 200_000 }),
          obligation({ id: 'o2', dueDate: TODAY + 3, amount: 300_000 }),
          obligation({ id: 'o3', dueDate: TODAY + 40, amount: 999_000 }),
        ],
      }),
      TODAY,
    );
    expect(state.vencidosCount).toBe(1);
    expect(state.proximosCount).toBe(1);
    expect(state.pendingThisMonth).toBe(500_000);
    expect(state.availableBalance).toBe(500_000);
    expect(state.isOverBudget).toBe(false);
  });

  test('ahorro: reparte el ingreso según el modelo', () => {
    const state = budgetState(
      data({ incomes, obligations: [obligation({ category: 'OCIO', amount: 50_000, dueDate: TODAY + 1 })] }),
      TODAY,
    );
    expect(state.necesidadesAllocated).toBe(500_000);
    expect(state.deseosAllocated).toBe(300_000);
    expect(state.ahorroGoal).toBe(200_000);
    expect(state.deseosSpent).toBe(50_000);
    expect(state.ahorroReal).toBe(950_000);
  });

  test('reportes: categorías ordenadas y meses con datos', () => {
    const state = reportsState(
      data({
        incomes,
        obligations: [
          obligation({ id: 'o1', category: 'SALUD', amount: 100_000, isPaid: true }),
          obligation({ id: 'o2', category: 'OCIO', amount: 300_000 }),
          obligation({ id: 'o3', dueDate: epochDayOf(2026, 8, 1) }),
        ],
      }),
      { year: 2026, month: 10 },
      TODAY,
    );
    expect(state.categories.map((c) => c.category)).toEqual(['OCIO', 'SALUD']);
    expect(state.categories[0].percent).toBe(75);
    expect(state.paidPercent).toBe(25);
    expect(state.months).toEqual([
      { year: 2026, month: 8 },
      { year: 2026, month: 10 },
    ]);
  });

  test('recordatorios: antes, el día y después del vencimiento, solo a futuro', () => {
    const reminders = remindersFor([obligation({ dueDate: TODAY + 1 }), obligation({ id: 'o2', isPaid: true })], 3, () => '', TODAY);
    expect(reminders.map((r) => [r.date - TODAY, r.title])).toEqual([
      [1, 'Luz vence hoy'],
      [2, 'Luz está vencido'],
    ]);
  });
});

describe('OCR de facturas', () => {
  test('detecta monto y vencimiento por palabras clave', () => {
    const result = parseInvoiceText(
      'ANDE\nNIS 123456\nFecha de vencimiento: 20/10/2026\nTotal a pagar: Gs. 1.045.000',
      TODAY,
    );
    expect(result.suggestedAmount).toBe(1_045_000);
    expect(result.suggestedDueDate).toBe(epochDayOf(2026, 10, 20));
  });

  test('acepta meses escritos y elige el monto mayor sin palabra clave', () => {
    const result = parseInvoiceText('Cuota 12.500\nSaldo 350.000\nVence el 5 de noviembre de 2026', TODAY);
    expect(result.suggestedAmount).toBe(350_000);
    expect(result.suggestedDueDate).toBe(epochDayOf(2026, 11, 5));
  });

  test('ignora fechas inválidas', () => {
    expect(parseInvoiceText('Vencimiento 31/02/2026', TODAY).suggestedDueDate).toBeNull();
  });
});
