// Tiene que ser lo primero: completa APIs que usan otras librerías.
import '@/polyfills';

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { LogBox } from 'react-native';

import { resetSecureStateOnFreshInstall } from '@/data/secureStorage';
import { InitialSyncScreen } from '@/features/InitialSyncScreen';
import { AppDataProvider, useAppData } from '@/state/AppDataProvider';
import { AppLockProvider } from '@/state/AppLock';
import { FONT_ASSETS, useTheme } from '@/ui/theme';

SplashScreen.preventAutoHideAsync();
resetSecureStateOnFreshInstall();

// Aviso interno de React Native en las transiciones de navegación; no indica un problema de la app.
LogBox.ignoreLogs(['Sending `onAnimatedValueUpdate` with no listeners registered.']);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  return (
    <AppDataProvider>
      <RootNavigator fontsReady={fontsLoaded || fontError != null} />
    </AppDataProvider>
  );
}

/**
 * Cada estado de la app tiene su propia sección de rutas. Al iniciar/cerrar sesión o terminar el
 * onboarding cambia el estado y el router pasa solo a la sección correspondiente, sin navegar a mano.
 */
function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { state } = useAppData();
  const { colors } = useTheme();
  const ready = fontsReady && state !== 'loading';

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // El bloqueo se monta desde el arranque para distinguir "abrí la app" de "inicié sesión".
  return (
    <AppLockProvider sessionState={state}>
      {ready && <AppStack />}
    </AppLockProvider>
  );
}

function AppStack() {
  const { state } = useAppData();
  const { colors, dark } = useTheme();
  if (state === 'syncing' || state === 'needs_connection') {
    return (
      <>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <InitialSyncScreen />
      </>
    );
  }
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={state === 'logged_out'}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
        </Stack.Protected>
        <Stack.Protected guard={state === 'onboarding'}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={state === 'ready'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="obligation" />
          <Stack.Screen name="scan" />
          <Stack.Screen name="income" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
        {/* Links de los emails: tienen que poder abrirse con o sin sesión. */}
        <Stack.Screen name="auth/callback" />
      </Stack>
    </>
  );
}
