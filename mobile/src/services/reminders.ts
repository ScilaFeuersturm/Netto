import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { numericEs, toParts } from '@/domain/dates';
import { formatMoney } from '@/domain/format';
import type { Obligation } from '@/domain/models';
import { remindersFor } from '@/features/selectors';

/**
 * Recordatorios de vencimientos con notificaciones locales programadas. En Android antes se usaba
 * WorkManager con una revisión diaria; iOS no permite eso, así que ahora cada vez que cambian las
 * facturas se reprograman los avisos de cada una (funciona igual en ambas plataformas, sin conexión).
 */
const CHANNEL_ID = 'netto_reminders';
const REMINDER_HOUR = 9;
/** iOS conserva como máximo 64 notificaciones pendientes por app. */
const MAX_SCHEDULED = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationPermission = 'granted' | 'undetermined' | 'denied';

/** Crea el canal de Android y devuelve el estado del permiso, sin pedirlo. */
export async function prepareNotifications(): Promise<NotificationPermission> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Recordatorios de vencimientos',
      description: 'Avisos de pagos próximos a vencer o vencidos',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  return current.canAskAgain ? 'undetermined' : 'denied';
}

/** Muestra el pedido de permiso del sistema. Llamarlo solo después de explicar para qué sirve. */
export async function requestNotificationPermission(): Promise<boolean> {
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

let lastSignature: string | null = null;
let queue: Promise<void> = Promise.resolve();

/** Reemplaza todos los avisos programados por los que corresponden a `obligations`. */
export function syncReminders(obligations: Obligation[], reminderDaysBefore: number): Promise<void> {
  queue = queue.then(() => doSync(obligations, reminderDaysBefore)).catch(() => {});
  return queue;
}

/** Al cerrar sesión: solo se avisa de los vencimientos del usuario con la sesión abierta. */
export function clearReminders(): Promise<void> {
  queue = queue
    .then(async () => {
      lastSignature = null;
      await Notifications.cancelAllScheduledNotificationsAsync();
    })
    .catch(() => {});
  return queue;
}

async function doSync(obligations: Obligation[], reminderDaysBefore: number): Promise<void> {
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) return;

  const now = Date.now();
  const reminders = remindersFor(
    obligations,
    reminderDaysBefore,
    (o) => `${formatMoney(o.amount, o.currency)} · vence el ${numericEs(o.dueDate)}`,
  )
    .map((r) => {
      const { year, month, day } = toParts(r.date);
      return { ...r, at: new Date(year, month - 1, day, REMINDER_HOUR) };
    })
    .filter((r) => r.at.getTime() > now)
    .slice(0, MAX_SCHEDULED);

  const signature = JSON.stringify(reminders.map((r) => [r.obligationId, r.at.getTime(), r.title, r.body]));
  if (signature === lastSignature) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      content: { title: reminder.title, body: reminder.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.at,
        channelId: CHANNEL_ID,
      },
    });
  }
  lastSignature = signature;
}
