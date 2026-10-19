import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState } from 'react-native';

import { CurrencyConverter, EMPTY_RATES, type ExchangeRates } from '@/domain/currency';
import { defaultBudgetPlan } from '@/domain/models';
import { openDatabase, subscribeToDataChanges } from '@/data/db';
import { usePremium } from '@/data/premium';
import { readRates, refreshRatesIfStale } from '@/data/rates';
import { getBudgetPlan, getIncomes, getObligations, getPaymentHistory, getUser } from '@/data/repository';
import { currentUserId } from '@/data/session';
import type { UserData } from '@/features/selectors';
import { clearReminders, prepareNotifications, syncReminders } from '@/services/reminders';
import { hasSyncedOnce } from '@/sync/engine';
import { scheduleSync, syncNow } from '@/sync/scheduler';

/**
 * En qué parte de la app está el usuario: sin sesión, bajando por primera vez los datos de su cuenta
 * en este teléfono (o esperando conexión para hacerlo), configurando su cuenta o usando la app.
 */
export type AppState = 'loading' | 'logged_out' | 'syncing' | 'needs_connection' | 'onboarding' | 'ready';

type AppDataContextValue = UserData & {
  state: AppState;
  rates: ExchangeRates;
  /** Reintenta la primera descarga de datos (estado needs_connection). */
  retryInitialSync: () => void;
};

const EMPTY_DATA: AppDataContextValue = {
  state: 'loading',
  user: null,
  plan: defaultBudgetPlan(),
  obligations: [],
  incomes: [],
  history: [],
  rates: EMPTY_RATES,
  converter: CurrencyConverter.identity('PYG'),
  retryInitialSync: () => {},
};

const AppDataContext = createContext<AppDataContextValue>(EMPTY_DATA);

/**
 * Carga los datos del usuario con sesión abierta y los vuelve a cargar cada vez que algo se escribe
 * (reemplaza a los Flow de Room/DataStore). Los volúmenes son chicos, así que se recarga todo junto.
 * Al iniciar/cerrar sesión o terminar el onboarding cambia `state` y el router muestra la sección que corresponde.
 */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppDataContextValue>(EMPTY_DATA);
  const loadId = useRef(0);
  /** Usuario para el que ya se intentó la primera descarga en esta ejecución. */
  const initialSyncAttempted = useRef<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const retryInitialSync = useCallback(() => {
    initialSyncAttempted.current = null;
    setRetryCount((n) => n + 1);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    async function load() {
      const id = ++loadId.current;
      const userId = currentUserId();
      const rates = readRates();
      if (userId == null) {
        initialSyncAttempted.current = null;
        if (id === loadId.current) setData({ ...EMPTY_DATA, state: 'logged_out', rates, retryInitialSync });
        return;
      }
      const [user, plan, obligations, incomes, history] = await Promise.all([
        getUser(userId),
        getBudgetPlan(userId),
        getObligations(userId),
        getIncomes(userId),
        getPaymentHistory(userId),
      ]);
      if (id !== loadId.current || cancelled) return;
      if (!user) {
        // La sesión apunta a un usuario sin datos locales (ej. datos borrados): se trata como sin sesión.
        setData({ ...EMPTY_DATA, state: 'logged_out', rates, retryInitialSync });
        return;
      }
      if (!plan && !(await hasSyncedOnce(userId))) {
        // Teléfono nuevo para esta cuenta: hay que bajar sus datos antes de decidir si falta el
        // onboarding (si no, un onboarding nuevo pisaría la configuración real de la cuenta).
        if (initialSyncAttempted.current !== userId) {
          initialSyncAttempted.current = userId;
          setData({ ...EMPTY_DATA, state: 'syncing', user, rates, retryInitialSync });
          await syncNow().catch(() => {});
          if (!cancelled) await load();
        } else if (id === loadId.current && !cancelled) {
          setData({ ...EMPTY_DATA, state: 'needs_connection', user, rates, retryInitialSync });
        }
        return;
      }
      const effectivePlan = plan ?? defaultBudgetPlan(userId);
      setData({
        state: effectivePlan.onboardingCompleted ? 'ready' : 'onboarding',
        user,
        plan: effectivePlan,
        obligations,
        incomes,
        history,
        rates,
        converter: new CurrencyConverter(effectivePlan.displayCurrency, rates),
        retryInitialSync,
      });
    }

    openDatabase()
      .then(() => {
        if (cancelled) return;
        unsubscribe = subscribeToDataChanges(() => void load());
        return load();
      })
      // Cotizaciones frescas al abrir la app; si no hay conexión se siguen usando las guardadas.
      .then(() => refreshRatesIfStale())
      // Cambios hechos desde otros dispositivos mientras la app estaba cerrada.
      .then(() => scheduleSync(0));

    // Al volver a primer plano se sincroniza.
    const appStateSubscription = RNAppState.addEventListener('change', (next) => {
      if (next === 'active') scheduleSync(0);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      appStateSubscription.remove();
    };
  }, [retryCount, retryInitialSync]);

  // Recordatorios (Premium): se reprograman cuando cambian las facturas, los días de aviso o el plan.
  const { state, obligations, plan } = data;
  const { premium } = usePremium();
  const preparedNotifications = useRef(false);
  useEffect(() => {
    if (state === 'logged_out' || (state === 'ready' && !premium)) {
      void clearReminders();
      return;
    }
    if (state !== 'ready') return;
    (async () => {
      // El permiso se pide desde NotificationPrimer, después de explicarlo; acá solo se prepara el canal.
      if (!preparedNotifications.current) {
        preparedNotifications.current = true;
        await prepareNotifications().catch(() => 'denied');
      }
      await syncReminders(obligations, plan.reminderDaysBefore);
    })();
  }, [state, obligations, plan.reminderDaysBefore, premium]);

  return <AppDataContext.Provider value={data}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  return useContext(AppDataContext);
}

/** Memoriza un cálculo derivado de los datos de la app (`compute` debe ser una función estable). */
export function useDerived<T>(compute: (data: AppDataContextValue) => T): T {
  const data = useAppData();
  return useMemo(() => compute(data), [compute, data]);
}
