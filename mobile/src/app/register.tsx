import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Linking, View } from 'react-native';

import { register } from '@/data/auth';
import { LegalLinks } from '@/domain/legal';
import { passwordProblem, PASSWORD_HINT } from '@/domain/passwordPolicy';
import { AuthLayout, isValidEmail } from '@/features/auth';
import { Checkbox, PasswordField, TextField } from '@/ui/form';
import { AlertBanner, PrimaryButton, TextButton } from '@/ui/primitives';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** El servidor pide confirmar el email antes de entrar. */
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  const emailError = email.trim() !== '' && !isValidEmail(email) ? 'Ingresá un email válido' : null;
  const passwordError = password.length > 0 ? passwordProblem(password) : null;
  const confirmError = confirmPassword.length > 0 && confirmPassword !== password ? 'Las contraseñas no coinciden' : null;
  const canSubmit =
    name.trim() !== '' && isValidEmail(email) && passwordProblem(password) == null && confirmPassword === password && acceptedLegal && !isLoading;

  const edit = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setError(null);
  };

  const submit = async () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    const result = await register(name, email, password);
    if (!result.ok) {
      setLoading(false);
      setError(result.message);
    } else if (result.needsConfirmation) {
      setLoading(false);
      setConfirmationSentTo(email.trim());
    }
  };

  return (
    <AuthLayout title="Creá tu cuenta" subtitle="Tus datos quedan en tu cuenta y se sincronizan entre tus dispositivos.">
      {confirmationSentTo ? (
        <>
          <AlertBanner
            icon="mark-email-read"
            message={`Te enviamos un email a ${confirmationSentTo}. Abrí el link desde este teléfono para activar tu cuenta.`}
          />
          <TextButton text="Ir a iniciar sesión" onPress={() => router.replace('/login')} />
        </>
      ) : (
        <>
          <TextField label="Nombre" testID="register-name" value={name} onChangeText={edit(setName)} autoCapitalize="words" autoComplete="name" />
          <TextField
            label="Email"
            testID="register-email"
            value={email}
            onChangeText={edit(setEmail)}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <PasswordField
            label="Contraseña"
            testID="register-password"
            value={password}
            onChangeText={edit(setPassword)}
            error={passwordError}
            supporting={PASSWORD_HINT}
            // Evita la "contraseña segura" de iOS: la app no tiene un dominio web asociado y,
            // con campos controlados, ese autocompletado pisa lo que se escribe.
            textContentType="oneTimeCode"
          />
          <PasswordField
            label="Repetí la contraseña"
            testID="register-confirm"
            value={confirmPassword}
            onChangeText={edit(setConfirmPassword)}
            error={confirmError}
            textContentType="oneTimeCode"
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <Checkbox
            testID="register-legal"
            label="Leí y acepto los términos y condiciones y la política de privacidad."
            checked={acceptedLegal}
            onChange={setAcceptedLegal}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: -8 }}>
            <TextButton text="Ver términos" onPress={() => void Linking.openURL(LegalLinks.terms)} />
            <TextButton text="Ver privacidad" onPress={() => void Linking.openURL(LegalLinks.privacy)} />
          </View>
          {error && <AlertBanner message={error} critical />}
          <PrimaryButton
            text={isLoading ? 'Creando cuenta…' : 'Crear cuenta'}
            onPress={submit}
            disabled={!canSubmit}
            loading={isLoading}
          />
          <TextButton
            text="¿Ya tenés cuenta? Iniciá sesión"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
          />
        </>
      )}
    </AuthLayout>
  );
}
