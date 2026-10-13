import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { notifyDataChanged } from '@/data/db';
import { prepareNotifications, requestNotificationPermission } from '@/services/reminders';
import { Dialog } from '@/ui/form';
import { Icon, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

const PRIMED_KEY = 'notifications_primed';

/**
 * Explica para qué sirven los recordatorios antes de mostrar el pedido de permiso del sistema
 * (si se rechaza en el sistema, después solo se puede activar desde los ajustes del teléfono).
 * Se muestra una sola vez.
 */
export function NotificationPrimer() {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Storage.getItemSync(PRIMED_KEY) === 'true') return;
    prepareNotifications()
      .then((status) => setVisible(status === 'undetermined'))
      .catch(() => {});
  }, []);

  const close = async (activate: boolean) => {
    setVisible(false);
    await Storage.setItem(PRIMED_KEY, 'true');
    if (activate && (await requestNotificationPermission().catch(() => false))) {
      // Con el permiso concedido se programan los recordatorios de las facturas existentes.
      notifyDataChanged();
    }
  };

  return (
    <Dialog
      visible={visible}
      title="¿Te avisamos antes de que venzan tus facturas?"
      confirmText="Activar avisos"
      onConfirm={() => void close(true)}
      cancelText="Ahora no"
      onDismiss={() => void close(false)}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <Icon name="notifications-active" color={colors.primary} />
        <Text style={{ flex: 1 }} color={colors.onSurfaceVariant}>
          Te mandamos un aviso unos días antes del vencimiento, el día que vence y si quedó impaga. Los avisos se
          generan en tu teléfono; podés desactivarlos cuando quieras desde los ajustes.
        </Text>
      </View>
    </Dialog>
  );
}
