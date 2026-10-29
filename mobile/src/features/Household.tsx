import { useState } from 'react';
import { Share, View } from 'react-native';

import {
  createHousehold,
  createHouseholdInvite,
  deleteHousehold,
  HOUSEHOLD_MAX_MEMBERS,
  joinHousehold,
  leaveHousehold,
  removeHouseholdMember,
  useHousehold,
  type Household,
} from '@/data/household';
import { usePremium } from '@/data/premium';
import { currentUserId } from '@/data/session';
import { syncNow } from '@/sync/scheduler';
import { Dialog, SwitchRow, TextField } from '@/ui/form';
import { AlertBanner, Card, Divider, Icon, IconButton, PrimaryButton, Tag, Text, TextButton, TonalButton } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

import { goToPremium } from './Premium';

/** Nombre visible de una persona del grupo ("Ana"), o "otra persona" si ya no está. */
export function memberName(household: Household | null, userId: string): string {
  const name = household?.members.find((m) => m.userId === userId)?.name.trim();
  return name ? name.split(' ')[0] : 'otra persona';
}

/**
 * Interruptor "Compartir con la casa" de facturas e ingresos. Solo aparece si la persona está en un
 * grupo. Si el dato lo cargó otra persona, no se puede cambiar: se explica por qué.
 */
export function ShareWithHousehold({
  value,
  onChange,
  ownerId,
  testID,
}: {
  value: boolean;
  onChange: (shared: boolean) => void;
  /** Quién cargó el dato (al editar); vacío si es nuevo. */
  ownerId?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const household = useHousehold();
  if (!household) return null;
  const someoneElse = ownerId != null && ownerId !== currentUserId();
  if (someoneElse) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="group" size={18} color={colors.onSurfaceVariant} />
        <Text variant="bodySmall" color={colors.onSurfaceVariant} style={{ flex: 1 }}>
          {`Compartida con ${household.name}. La cargó ${memberName(household, ownerId)}: solo esa persona puede dejar de compartirla.`}
        </Text>
      </View>
    );
  }
  return (
    <SwitchRow
      label={`Compartir con ${household.name}`}
      supporting="Lo van a ver y poder editar las personas de tu grupo. Si no, es solo tuyo."
      value={value}
      onValueChange={onChange}
      testID={testID}
    />
  );
}

/** Etiqueta para facturas e ingresos compartidos: "De la casa" o "De la casa · Ana" si lo cargó otra persona. */
export function SharedTag({ ownerId, householdId }: { ownerId: string; householdId: string | null }) {
  const { colors } = useTheme();
  const household = useHousehold();
  if (!householdId) return null;
  const mine = ownerId === currentUserId();
  return (
    <Tag
      text={mine ? 'De la casa' : `De la casa, cargó ${memberName(household, ownerId)}`}
      container={colors.primaryContainer}
      contentColor={colors.onPrimaryContainer}
    />
  );
}

type Busy = null | 'create' | 'invite' | 'join' | 'leave' | 'remove' | 'delete';

/** Tarjeta "Plan familiar" del perfil: crear el grupo, invitar, sumarse con un código, salir o disolverlo. */
export function FamilyCard() {
  const { colors } = useTheme();
  const household = useHousehold();
  const { premium, plan } = usePremium();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [confirm, setConfirm] = useState<null | { kind: 'leave' | 'delete' } | { kind: 'remove'; userId: string }>(null);

  const run = async (kind: Busy, action: () => Promise<{ ok: true } | { ok: false; message: string }>) => {
    setBusy(kind);
    setError(null);
    const result = await action();
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    // Trae (o suelta) lo compartido en el momento.
    void syncNow().catch(() => {});
    return true;
  };

  const invite = async () => {
    setBusy('invite');
    setError(null);
    const result = await createHouseholdInvite();
    setBusy(null);
    if (result.ok) setCode(result.value);
    else setError(result.message);
  };

  const shareCode = (value: string) =>
    void Share.share({
      message: `Sumate a mi grupo en Inariko para compartir las cuentas de la casa. Entrá a Perfil → Plan familiar y escribí este código: ${value}`,
    }).catch(() => {});

  const isOwner = household?.isOwner ?? false;
  const hasFamilyPlan = premium && plan === 'family';
  const full = (household?.members.length ?? 0) >= HOUSEHOLD_MAX_MEMBERS;

  return (
    <Card style={{ gap: 12 }}>
      <View>
        <Text variant="titleMedium" header>
          Plan familiar
        </Text>
        <Text variant="bodySmall" color={colors.onSurfaceVariant}>
          {household
            ? `Hasta ${HOUSEHOLD_MAX_MEMBERS} personas comparten las facturas, ingresos y pagos que marquen como "de la casa". Lo demás sigue siendo privado.`
            : `Compartí las cuentas de la casa con hasta ${HOUSEHOLD_MAX_MEMBERS - 1} personas más. Cada uno elige qué comparte; lo demás sigue siendo privado.`}
        </Text>
      </View>

      {household ? (
        <>
          <Text variant="titleSmall">{household.name}</Text>
          <View style={{ gap: 4 }}>
            {household.members.map((member) => (
              <View key={member.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 }}>
                <Icon name={member.role === 'owner' ? 'workspace-premium' : 'person-outline'} size={20} color={colors.brand} />
                <Text style={{ flex: 1 }}>
                  {member.userId === currentUserId() ? `${member.name || 'Vos'} (vos)` : member.name || 'Sin nombre'}
                </Text>
                {member.role === 'owner' && <Tag text="Paga el plan" />}
                {isOwner && member.role !== 'owner' && (
                  <IconButton
                    icon="person-remove"
                    label={`Sacar a ${member.name || 'esta persona'} del grupo`}
                    onPress={() => setConfirm({ kind: 'remove', userId: member.userId })}
                  />
                )}
              </View>
            ))}
          </View>
          <Divider />

          {isOwner && !full && (
            <>
              {code ? (
                <View style={{ gap: 8 }}>
                  <Text variant="bodySmall" color={colors.onSurfaceVariant}>
                    Pasale este código a quien quieras sumar. Sirve una sola vez y vence en 7 días.
                  </Text>
                  <Text
                    variant="headlineSmall"
                    testID="household-invite-code"
                    // Letra por letra, para que el lector de pantalla lo deletree (los espacios se ignoran al usarlo).
                    accessibilityLabel={code.split('').join(' ')}
                    style={{ letterSpacing: 4, textAlign: 'center' }}
                    selectable
                  >
                    {code}
                  </Text>
                  <TonalButton text="Compartir código" icon="share" onPress={() => shareCode(code)} />
                </View>
              ) : (
                <TonalButton text="Invitar a alguien" icon="person-add" onPress={() => void invite()} loading={busy === 'invite'} />
              )}
            </>
          )}
          {isOwner && full && (
            <Text variant="bodySmall" color={colors.onSurfaceVariant}>
              {`El grupo está completo (${HOUSEHOLD_MAX_MEMBERS} personas).`}
            </Text>
          )}
          {error && <AlertBanner critical message={error} />}
          <TextButton
            text={isOwner ? 'Disolver el grupo' : 'Salir del grupo'}
            onPress={() => setConfirm({ kind: isOwner ? 'delete' : 'leave' })}
          />
        </>
      ) : (
        <>
          {hasFamilyPlan ? (
            <PrimaryButton
              text="Crear mi grupo"
              icon="group-add"
              onPress={() => void run('create', () => createHousehold('Mi casa'))}
              loading={busy === 'create'}
            />
          ) : (
            <TonalButton text="Ver el plan familiar" icon="workspace-premium" onPress={goToPremium} />
          )}
          <View style={{ gap: 8 }}>
            <Text variant="titleSmall">¿Te invitaron?</Text>
            <TextField
              label="Código de invitación"
              testID="household-join-code"
              value={joinCode}
              onChangeText={(v) => {
                // Solo letras y números: se puede pegar con espacios o guiones.
                setJoinCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                setError(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={24}
              returnKeyType="done"
              onSubmitEditing={() => void run('join', () => joinHousehold(joinCode))}
            />
            {error && <AlertBanner critical message={error} />}
            <TonalButton
              text="Sumarme al grupo"
              onPress={() => void run('join', () => joinHousehold(joinCode))}
              disabled={joinCode.trim().length < 8}
              loading={busy === 'join'}
            />
          </View>
        </>
      )}

      <Dialog
        visible={confirm?.kind === 'leave'}
        title="¿Salir del grupo?"
        confirmText="Salir"
        onConfirm={() => {
          setConfirm(null);
          void run('leave', leaveHousehold);
        }}
        onDismiss={() => setConfirm(null)}
      >
        <Text color={colors.onSurfaceVariant}>
          Lo que compartiste vuelve a ser solo tuyo, dejás de ver lo de los demás y, si tenías Premium por el plan
          familiar, lo perdés.
        </Text>
      </Dialog>
      <Dialog
        visible={confirm?.kind === 'remove'}
        title="¿Sacar a esta persona del grupo?"
        confirmText="Sacar"
        onConfirm={() => {
          const target = confirm?.kind === 'remove' ? confirm.userId : null;
          setConfirm(null);
          if (target) void run('remove', () => removeHouseholdMember(target));
        }}
        onDismiss={() => setConfirm(null)}
      >
        <Text color={colors.onSurfaceVariant}>
          Lo que esa persona compartió vuelve a ser solo suyo y deja de ver lo del grupo y de tener Premium.
        </Text>
      </Dialog>
      <Dialog
        visible={confirm?.kind === 'delete'}
        title="¿Disolver el grupo?"
        confirmText="Disolver"
        onConfirm={() => {
          setConfirm(null);
          void run('delete', deleteHousehold);
        }}
        onDismiss={() => setConfirm(null)}
      >
        <Text color={colors.onSurfaceVariant}>
          Cada uno se queda con lo que cargó y deja de ver lo de los demás. Las otras personas pierden el Premium del
          plan familiar.
        </Text>
      </Dialog>
    </Card>
  );
}
