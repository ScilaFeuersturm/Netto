import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard } from 'react-native';

import { login } from '@/data/auth';
import { AuthLayout, isValidEmail } from '@/features/auth';
import { PasswordField, TextField } from '@/ui/form';
import { AlertBanner, PrimaryButton, TextButton } from '@/ui/primitives';

/** Al iniciar sesión correctamente no hace falta navegar: la app reacciona al cambio de sesión. */
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = isValidEmail(email) && password.length > 0 && !isLoading;

  const submit = async () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    const result = await login(email, password);
    if (!result.ok) {
      setLoading(false);
      setError(result.message);
    }
  };

  return (
    <AuthLayout title="Iniciá sesión" subtitle="Tus cuentas, vencimientos y ahorro, siempre a mano.">
      <TextField
        label="Email"
        testID="login-email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setError(null);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <PasswordField
        label="Contraseña"
        testID="login-password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setError(null);
        }}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {error && <AlertBanner message={error} critical />}
      <PrimaryButton text={isLoading ? 'Ingresando…' : 'Ingresar'} onPress={submit} disabled={!canSubmit} loading={isLoading} />
      <TextButton text="¿Olvidaste tu contraseña?" onPress={() => router.push('/forgot-password')} />
      <TextButton text="¿No tenés cuenta? Registrate" onPress={() => router.push('/register')} />
    </AuthLayout>
  );
}
