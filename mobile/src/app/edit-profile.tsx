import { useRef, useState } from 'react';
import { Keyboard, type TextInput } from 'react-native';

import { changePassword, requestEmailChange } from '@/data/auth';
import { updateProfileName } from '@/data/repository';
import { passwordProblem, PASSWORD_HINT } from '@/domain/passwordPolicy';
import { isValidEmail } from '@/features/auth';
import { useAppData } from '@/state/AppDataProvider';
import { PasswordField, TextField } from '@/ui/form';
import { AlertBanner, Card, Text, TonalButton } from '@/ui/primitives';
import { ScreenScroll } from '@/ui/Screen';
import { useTheme } from '@/ui/theme';

/** Cambiar el nombre, el email y la contraseña de la cuenta. Cada parte se guarda por separado. */
export default function EditProfileScreen() {
  const { user } = useAppData();
  return (
    <ScreenScroll title="Editar perfil">
      <NameCard current={user?.name ?? ''} />
      <EmailCard current={user?.email ?? ''} />
      <PasswordCard />
    </ScreenScroll>
  );
}

type Status = { ok: boolean; message: string } | null;

function StatusBanner({ status }: { status: Status }) {
  if (!status) return null;
  return status.ok ? (
    <AlertBanner icon="check-circle-outline" message={status.message} />
  ) : (
    <AlertBanner critical message={status.message} />
  );
}

function NameCard({ current }: { current: string }) {
  const [name, setName] = useState(current);
  const [status, setStatus] = useState<Status>(null);
  const trimmed = name.trim();
  const canSave = trimmed !== '' && trimmed !== current.trim();

  const save = async () => {
    if (!canSave) return;
    Keyboard.dismiss();
    await updateProfileName(trimmed);
    setStatus({ ok: true, message: 'Nombre guardado.' });
  };

  return (
    <Card style={{ gap: 12 }}>
      <Text variant="titleMedium" header>
        Nombre
      </Text>
      <TextField
        label="Cómo querés que te llamemos"
        testID="edit-name"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setStatus(null);
        }}
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="done"
        onSubmitEditing={save}
      />
      <StatusBanner status={status} />
      <TonalButton text="Guardar nombre" onPress={save} disabled={!canSave} />
    </Card>
  );
}

function EmailCard({ current }: { current: string }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInput>(null);
  const [isLoading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const normalized = email.trim().toLowerCase();
  const emailError = email.trim() !== '' && !isValidEmail(email) ? 'Ingresá un email válido' : null;
  const canSave = isValidEmail(email) && normalized !== current.toLowerCase() && password !== '' && !isLoading;

  const save = async () => {
    if (!canSave) return;
    Keyboard.dismiss();
    setLoading(true);
    const result = await requestEmailChange(normalized, password);
    setLoading(false);
    setStatus(
      result.ok
        ? {
            ok: true,
            message: `Te mandamos un enlace a ${normalized}: abrilo desde este teléfono para confirmar el cambio. También le avisamos a ${current}.`,
          }
        : { ok: false, message: result.message },
    );
    if (result.ok) {
      setEmail('');
      setPassword('');
    }
  };

  return (
    <Card style={{ gap: 12 }}>
      <Text variant="titleMedium" header>
        Email
      </Text>
      <Text variant="bodySmall" color={colors.onSurfaceVariant}>
        {`Ahora entrás con ${current}. Hasta que confirmes el cambio, seguís entrando con ese.`}
      </Text>
      <TextField
        label="Email nuevo"
        testID="edit-email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setStatus(null);
        }}
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <PasswordField
        ref={passwordRef}
        label="Tu contraseña actual"
        testID="edit-email-password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setStatus(null);
        }}
        supporting="Para confirmar que sos vos."
        textContentType="oneTimeCode"
        returnKeyType="done"
        onSubmitEditing={save}
      />
      <StatusBanner status={status} />
      <TonalButton text="Cambiar email" onPress={save} disabled={!canSave} loading={isLoading} />
    </Card>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  // El botón "siguiente" del teclado pasa al campo de abajo (el teclado los tapa y no se pueden tocar).
  const nextRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const problem = next.length > 0 ? passwordProblem(next) : null;
  const confirmError = confirm.length > 0 && confirm !== next ? 'Las contraseñas no coinciden' : null;
  const canSave = current !== '' && passwordProblem(next) == null && confirm === next && !isLoading;

  const edit = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setStatus(null);
  };

  const save = async () => {
    if (!canSave) return;
    Keyboard.dismiss();
    setLoading(true);
    const result = await changePassword(current, next);
    setLoading(false);
    if (result.ok) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setStatus({ ok: true, message: 'Listo, tu contraseña se actualizó. Te mandamos un aviso por email.' });
    } else {
      setStatus({ ok: false, message: result.message });
    }
  };

  return (
    <Card style={{ gap: 12 }}>
      <Text variant="titleMedium" header>
        Contraseña
      </Text>
      <PasswordField
        label="Contraseña actual"
        testID="edit-current-password"
        value={current}
        onChangeText={edit(setCurrent)}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => nextRef.current?.focus()}
        // iOS ve "actual + nueva" como un cambio de contraseña y rellena los campos solo, pisando lo
        // que se escribe (la app no tiene dominio asociado para guardar la clave). Se desactiva.
        textContentType="oneTimeCode"
      />
      <PasswordField
        ref={nextRef}
        label="Contraseña nueva"
        testID="edit-new-password"
        value={next}
        onChangeText={edit(setNext)}
        error={problem}
        supporting={PASSWORD_HINT}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmRef.current?.focus()}
        // Igual que en el registro: evita que la "contraseña segura" de iOS pise lo que se escribe.
        textContentType="oneTimeCode"
      />
      <PasswordField
        ref={confirmRef}
        label="Repetí la contraseña nueva"
        testID="edit-confirm-password"
        value={confirm}
        onChangeText={edit(setConfirm)}
        error={confirmError}
        textContentType="oneTimeCode"
        returnKeyType="done"
        onSubmitEditing={save}
      />
      <StatusBanner status={status} />
      <TonalButton text="Cambiar contraseña" onPress={save} disabled={!canSave} loading={isLoading} />
    </Card>
  );
}
