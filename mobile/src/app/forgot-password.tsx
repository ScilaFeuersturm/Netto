import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard } from 'react-native';

import { requestPasswordReset } from '@/data/auth';
import { AuthLayout, isValidEmail } from '@/features/auth';
import { TextField } from '@/ui/form';
import { AlertBanner, PrimaryButton, TextButton } from '@/ui/primitives';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!isValidEmail(email) || isLoading) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (result.ok) setSent(true);
    else setError(result.message);
  };

  return (
    <AuthLayout title="Recuperá tu contraseña" subtitle="Te mandamos un link a tu email para elegir una nueva.">
      {sent ? (
        <AlertBanner
          icon="mark-email-read"
          message={`Si existe una cuenta con ${email.trim()}, te llegó un email con el link. Abrilo desde este teléfono.`}
        />
      ) : (
        <>
          <TextField
            label="Email"
            testID="forgot-email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={submit}
          />
          {error && <AlertBanner message={error} critical />}
          <PrimaryButton text="Enviar link" onPress={submit} disabled={!isValidEmail(email)} loading={isLoading} />
        </>
      )}
      <TextButton text="Volver a iniciar sesión" onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))} />
    </AuthLayout>
  );
}
