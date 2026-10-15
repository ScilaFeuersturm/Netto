import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { deleteAccount, logout } from '@/data/auth';
import { timestampEs } from '@/domain/dates';
import { getSyncStatus, subscribeToSyncStatus, syncNow, type SyncStatus } from '@/sync/scheduler';
import { Dialog } from '@/ui/form';
import { AlertBanner, Card, Text, TextButton, TonalButton } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/** Estado de la sincronización con la nube y botón para sincronizar ya. */
export function SyncCard() {
  const { colors } = useTheme();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus);
  useEffect(() => subscribeToSyncStatus(setStatus), []);

  const description = status.syncing
    ? 'Sincronizando…'
    : status.offline
      ? 'Sin conexión: los cambios se guardan en el teléfono y se suben cuando vuelva internet.'
      : status.lastError
        ? 'No pudimos sincronizar. Vamos a reintentar automáticamente.'
        : status.lastSyncedAt
          ? `Todo sincronizado · ${timestampEs(status.lastSyncedAt)}`
          : 'Tus datos se guardan en tu cuenta y se sincronizan entre tus dispositivos.';

  return (
    <Card>
      <Text variant="titleMedium">Respaldo en la nube</Text>
      <Text variant="bodySmall" color={colors.onSurfaceVariant}>
        {description}
      </Text>
      <TonalButton
        text="Sincronizar ahora"
        icon="sync"
        onPress={() => void syncNow().catch(() => {})}
        loading={status.syncing}
        style={{ marginTop: 12 }}
      />
    </Card>
  );
}

/** Cerrar sesión (avisando si hay cambios sin subir) y borrar la cuenta. */
export function AccountActions() {
  const { colors } = useTheme();
  const [pending, setPending] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogout = async () => {
    setBusy(true);
    const result = await logout();
    setBusy(false);
    if (!result.ok) setPending(result.pendingChanges);
  };

  const onDelete = async () => {
    setConfirmDelete(false);
    setBusy(true);
    setError(null);
    const result = await deleteAccount();
    setBusy(false);
    if (!result.ok) setError(result.message);
  };

  return (
    <View style={{ gap: 12 }}>
      {error && <AlertBanner message={error} critical />}
      <TonalButton
        text="Cerrar sesión"
        icon="logout"
        onPress={() => void onLogout()}
        loading={busy}
        container={colors.errorContainer}
        contentColor={colors.onErrorContainer}
      />
      <TextButton text="Borrar mi cuenta" onPress={() => setConfirmDelete(true)} />

      <Dialog
        visible={pending != null}
        title="Hay cambios sin subir"
        confirmText="Cerrar sesión igual"
        onConfirm={() => {
          setPending(null);
          void logout({ force: true });
        }}
        onDismiss={() => setPending(null)}
      >
        <Text color={colors.onSurfaceVariant}>
          {`Tenés ${pending} ${pending === 1 ? 'cambio' : 'cambios'} que todavía no se guardaron en la nube (probablemente por falta de conexión). Si cerrás sesión ahora, se pierden.`}
        </Text>
      </Dialog>

      <Dialog
        visible={confirmDelete}
        title="¿Borrar tu cuenta?"
        confirmText="Borrar definitivamente"
        onConfirm={() => void onDelete()}
        onDismiss={() => setConfirmDelete(false)}
      >
        <Text color={colors.onSurfaceVariant}>
          Se eliminan tu cuenta y todos tus datos (facturas, ingresos, historial y configuración) de este teléfono y de la
          nube. No se puede deshacer.
        </Text>
      </Dialog>
    </View>
  );
}
