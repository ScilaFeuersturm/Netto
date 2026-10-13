import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard } from 'react-native';

import { updatePassword } from '@/data/auth';
import { passwordProblem, PASSWORD_HINT } from '@/domain/passwordPolicy';
import { PasswordField } from '@/ui/form';
import { AlertBanner, PrimaryButton } from '@/ui/primitives';
import { ScreenScroll } from '@/ui/Screen';

/** Elegir una contraseña nueva (después de abrir el link de recuperación, o desde el perfil). */
export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const problem = password.length > 0 ? passwordProblem(password) : null;
  const confirmError = confirm.length > 0 && confirm !== password ? 'Las contraseñas no coinciden' : null;
  const canSubmit = passwordProblem(password) == null && confirm === password && !isLoading;

  const submit = async () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    const result = await updatePassword(password);
    setLoading(false);
    if (result.ok) setDone(true);
    else setError(result.message);
  };

  return (
    <ScreenScroll title="Nueva contraseña">
      {done ? (
        <>
          <AlertBanner icon="check-circle-outline" message="Listo, tu contraseña se actualizó." />
          <PrimaryButton text="Continuar" onPress={() => router.replace('/')} />
        </>
      ) : (
        <>
          <PasswordField
            label="Nueva contraseña"
            testID="new-password"
            value={password}
            onChangeText={setPassword}
            error={problem}
            supporting={PASSWORD_HINT}
            textContentType="oneTimeCode"
          />
          <PasswordField
            label="Repetila"
            testID="new-password-confirm"
            value={confirm}
            onChangeText={setConfirm}
            error={confirmError}
            textContentType="oneTimeCode"
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          {error && <AlertBanner message={error} critical />}
          <PrimaryButton text="Guardar contraseña" onPress={submit} disabled={!canSubmit} loading={isLoading} />
        </>
      )}
    </ScreenScroll>
  );
}
