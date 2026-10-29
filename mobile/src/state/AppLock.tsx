import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Keyboard, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { logout, verifyCurrentUserPassword } from '@/data/auth';
import type { AppState as SessionState } from '@/state/AppDataProvider';
import { getSecureItem, setSecureItem } from '@/data/secureStorage';
import { LOCK_AFTER_MS, shouldLock } from '@/domain/lockPolicy';
import { currentUserId } from '@/data/session';
import { PasswordField } from '@/ui/form';
import { AlertBanner, Icon, PrimaryButton, Text, TextButton } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

const LAST_ACTIVE_KEY = 'lock_last_active_at';
const BIOMETRIC_PREF_KEY = 'lock_biometric_unlock';

export type Biometrics = { available: boolean; label: string; icon: string };

type AppLockContextValue = {
  biometrics: Biometrics;
  biometricUnlockEnabled: boolean;
  setBiometricUnlockEnabled: (enabled: boolean) => void;
};

const AppLockContext = createContext<AppLockContextValue>({
  biometrics: { available: false, label: '', icon: 'fingerprint' },
  biometricUnlockEnabled: false,
  setBiometricUnlockEnabled: () => {},
});

export function useAppLock(): AppLockContextValue {
  return useContext(AppLockContext);
}

function readLastActive(): number | null {
  const value = Number(getSecureItem(LAST_ACTIVE_KEY) ?? NaN);
  return Number.isFinite(value) ? value : null;
}

/** Guarda el momento de la última interacción real (no "la app estaba abierta"). */
function markActive(at: number = Date.now()): void {
  setSecureItem(LAST_ACTIVE_KEY, String(at));
}

async function detectBiometrics(): Promise<Biometrics> {
  const none: Biometrics = { available: false, label: '', icon: 'fingerprint' };
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return none;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return { available: true, label: Platform.OS === 'ios' ? 'Face ID' : 'reconocimiento facial', icon: 'face' };
    }
    return { available: true, label: Platform.OS === 'ios' ? 'Touch ID' : 'huella', icon: 'fingerprint' };
  } catch {
    return none;
  }
}

/**
 * Bloqueo por inactividad (requisito de seguridad para apps financieras). Con sesión abierta, si la
 * app pasa más de LOCK_AFTER_MS sin usarse, se pide biometría o la contraseña de la cuenta.
 * Además, mientras la app no está activa se tapa el contenido para que los montos no queden
 * en la vista previa del selector de apps.
 */
export function AppLockProvider({ sessionState, children }: { sessionState: SessionState; children: ReactNode }) {
  const loggedIn = sessionState === 'ready' || sessionState === 'onboarding';
  // Al abrir la app con una sesión guardada se revisa cuánto pasó desde el último uso.
  const [locked, setLocked] = useState(() => currentUserId() != null && shouldLock(readLastActive(), Date.now()));
  const [covered, setCovered] = useState(false);
  const [biometrics, setBiometrics] = useState<Biometrics>({ available: false, label: '', icon: 'fingerprint' });
  const [biometricPref, setBiometricPref] = useState(() => getSecureItem(BIOMETRIC_PREF_KEY) !== 'off');
  /** Último toque del usuario; se guarda en el Keychain cada 30 s y al pasar a segundo plano. */
  const lastTouch = useRef(0);

  useEffect(() => {
    detectBiometrics().then(setBiometrics);
  }, []);

  // Al iniciar sesión, la actividad arranca de cero.
  const previousState = useRef<SessionState>(sessionState);
  useEffect(() => {
    const previous = previousState.current;
    previousState.current = sessionState;
    if (loggedIn && previous === 'logged_out') markActive();
  }, [sessionState, loggedIn]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        setCovered(false);
        // Volver a abrir la app cuenta como interacción, salvo que ya haya pasado el tiempo límite.
        if (loggedIn && shouldLock(readLastActive(), Date.now())) {
          setLocked(true);
        } else if (loggedIn) {
          lastTouch.current = Date.now();
          markActive(lastTouch.current);
        }
      } else {
        setCovered(true);
        if (next === 'background' && loggedIn && !locked) markActive(lastTouch.current);
      }
    });
    return () => subscription.remove();
  }, [loggedIn, locked]);

  // Inactividad con la app abierta (sin tocar la pantalla).
  useEffect(() => {
    if (!loggedIn || locked) return;
    lastTouch.current = Date.now();
    markActive(lastTouch.current);
    const interval = setInterval(() => {
      if (Date.now() - lastTouch.current > LOCK_AFTER_MS) setLocked(true);
      else markActive(lastTouch.current);
    }, 30_000);
    return () => clearInterval(interval);
  }, [loggedIn, locked]);

  const unlock = useCallback(() => {
    markActive();
    lastTouch.current = Date.now();
    setLocked(false);
  }, []);

  const setBiometricUnlockEnabled = useCallback((enabled: boolean) => {
    setSecureItem(BIOMETRIC_PREF_KEY, enabled ? 'on' : 'off');
    setBiometricPref(enabled);
  }, []);

  const useBiometrics = biometrics.available && biometricPref;

  return (
    <AppLockContext.Provider value={{ biometrics, biometricUnlockEnabled: biometricPref, setBiometricUnlockEnabled }}>
      <View
        style={{ flex: 1 }}
        onStartShouldSetResponderCapture={() => {
          lastTouch.current = Date.now();
          return false;
        }}
      >
        {children}
        {loggedIn && locked && (
          <LockScreen
            biometrics={useBiometrics ? biometrics : null}
            onUnlock={unlock}
            onLogout={() => {
              setLocked(false);
              // Se intenta subir lo pendiente; si no hay conexión, se cierra igual (quien está frente
              // al teléfono no pudo desbloquearlo).
              void logout().then((result) => (result.ok ? undefined : logout({ force: true })));
            }}
          />
        )}
        {loggedIn && covered && !locked && <PrivacyCover />}
      </View>
    </AppLockContext.Provider>
  );
}

function PrivacyCover() {
  const { colors } = useTheme();
  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text variant="headlineMedium" color={colors.primary}>
        Inariko
      </Text>
    </View>
  );
}

function LockScreen({
  biometrics,
  onUnlock,
  onLogout,
}: {
  biometrics: Biometrics | null;
  onUnlock: () => void;
  onLogout: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const autoPrompted = useRef(false);

  const unlockWithBiometrics = useCallback(async () => {
    if (!biometrics) return;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloqueá Inariko',
      cancelLabel: 'Usar contraseña',
      fallbackLabel: '',
      disableDeviceFallback: true,
    });
    if (result.success) onUnlock();
  }, [biometrics, onUnlock]);

  useEffect(() => {
    if (biometrics && !autoPrompted.current) {
      autoPrompted.current = true;
      unlockWithBiometrics();
    }
  }, [biometrics, unlockWithBiometrics]);

  const unlockWithPassword = async () => {
    if (!password || checking) return;
    setChecking(true);
    setError(null);
    const valid = await verifyCurrentUserPassword(password).catch(() => false);
    setChecking(false);
    if (valid) {
      Keyboard.dismiss();
      onUnlock();
    } else {
      setError('La contraseña no es correcta.');
    }
  };

  return (
    <View
      accessibilityViewIsModal
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.background,
        paddingTop: insets.top + 48,
        paddingHorizontal: 24,
        gap: 16,
      }}
    >
      <View style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon name="lock-outline" size={40} color={colors.primary} />
        <Text variant="headlineSmall" color={colors.onBackground} header>
          Inariko está bloqueado
        </Text>
        <Text color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
          Por tu seguridad, la app se bloquea después de unos minutos sin uso.
        </Text>
      </View>
      {biometrics && (
        <PrimaryButton text={`Desbloquear con ${biometrics.label}`} icon={biometrics.icon} onPress={unlockWithBiometrics} />
      )}
      <PasswordField
        label="Contraseña de tu cuenta"
        testID="unlock-password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setError(null);
        }}
        returnKeyType="done"
        onSubmitEditing={unlockWithPassword}
      />
      {error && <AlertBanner message={error} critical />}
      <PrimaryButton text="Desbloquear" onPress={unlockWithPassword} disabled={!password} loading={checking} />
      <TextButton text="Cerrar sesión" onPress={onLogout} />
    </View>
  );
}
