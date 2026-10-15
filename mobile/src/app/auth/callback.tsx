import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { completeAuthFromLink } from '@/data/auth';
import { AlertBanner, TextButton } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * Destino de los links de los emails (netto://auth/callback?code=...): confirmación de cuenta o
 * recuperación de contraseña. Canjea el código por una sesión y sigue al lugar que corresponde.
 */
export default function AuthCallbackScreen() {
  const { colors } = useTheme();
  const { code, type, error_description: linkError } = useLocalSearchParams<{
    code?: string;
    type?: string;
    error_description?: string;
  }>();
  const [error, setError] = useState<string | null>(linkError ? 'El link venció o ya se usó. Pedí uno nuevo.' : null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !code) return;
    handled.current = true;
    completeAuthFromLink(code).then((result) => {
      if (!result.ok) setError(result.message);
      else router.replace(type === 'recovery' ? '/reset-password' : '/');
    });
  }, [code, type]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24, gap: 16 }}>
      {error || !code ? (
        <>
          <AlertBanner critical message={error ?? 'El link no es válido.'} />
          <TextButton text="Volver al inicio" onPress={() => router.replace('/')} />
        </>
      ) : (
        <ActivityIndicator size="large" color={colors.primary} />
      )}
    </View>
  );
}
