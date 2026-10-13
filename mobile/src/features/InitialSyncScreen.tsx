import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { logout } from '@/data/auth';
import { useAppData } from '@/state/AppDataProvider';
import { Icon, PrimaryButton, Text, TextButton } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/** Primera descarga de los datos de la cuenta en este teléfono, o aviso de que hace falta conexión. */
export function InitialSyncScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, user, retryInitialSync } = useAppData();
  const waiting = state === 'syncing';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 48,
        paddingHorizontal: 24,
        alignItems: 'center',
        gap: 16,
      }}
    >
      {waiting ? <ActivityIndicator size="large" color={colors.primary} /> : <Icon name="cloud-off" size={40} color={colors.primary} />}
      <Text variant="headlineSmall" color={colors.onBackground} style={{ textAlign: 'center' }}>
        {waiting ? 'Descargando tus datos…' : 'Necesitamos conexión'}
      </Text>
      <Text color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
        {waiting
          ? `Estamos trayendo la información de tu cuenta${user?.email ? ` (${user.email})` : ''} a este teléfono.`
          : 'Para usar tu cuenta en este teléfono primero hay que descargar tus datos. Conectate a internet y probá de nuevo.'}
      </Text>
      {!waiting && (
        <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 8 }}>
          <PrimaryButton text="Reintentar" icon="refresh" onPress={retryInitialSync} />
          <TextButton text="Cerrar sesión" onPress={() => void logout({ force: true })} />
        </View>
      )}
    </View>
  );
}
