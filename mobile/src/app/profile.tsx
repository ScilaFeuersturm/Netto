import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { CURRENCY_CODES, Currencies, rateOf, type CurrencyCode } from '@/domain/currency';
import { fromLocalDate, numericEs, timestampEs } from '@/domain/dates';
import { LegalLinks, SUPPORT_EMAIL } from '@/domain/legal';
import { formatMoney, formatRate, parseAmount, parseRateInput, rateToInput, sanitizeAmountInput } from '@/domain/format';
import { RATES_SOURCE_NAME, refreshRates, setManualRate } from '@/data/rates';
import { setDisplayCurrency, setReminderDaysBefore } from '@/data/repository';
import { REMINDER_DAY_OPTIONS } from '@/domain/models';
import { usePremium } from '@/data/premium';
import { goToPremium, PremiumLocked } from '@/features/Premium';
import { AccountActions, SyncCard } from '@/features/AccountActions';
import { initialsOf } from '@/features/selectors';
import { useAppData } from '@/state/AppDataProvider';
import { LOCK_AFTER_MS } from '@/domain/lockPolicy';
import { useAppLock } from '@/state/AppLock';
import { Chip, CurrencySelector, Dialog, SwitchRow, TextField } from '@/ui/form';
import { Card, Divider, IconButton, Text, TextButton, TonalButton } from '@/ui/primitives';
import { ScreenScroll } from '@/ui/Screen';
import { useTheme } from '@/ui/theme';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, converter } = useAppData();
  const [isRefreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<CurrencyCode | null>(null);

  const onRefresh = async () => {
    if (isRefreshing) return;
    setRefreshing(true);
    setMessage(null);
    try {
      await refreshRates();
      setMessage('Cotizaciones actualizadas.');
    } catch {
      setMessage('No pudimos actualizar las cotizaciones. Revisá tu conexión.');
    } finally {
      setRefreshing(false);
    }
  };

  /** `text` es lo que vale 1 US$ en `currency`, con coma decimal ("1450,50"). Devuelve false si no es válido. */
  const saveRate = (currency: CurrencyCode, text: string): boolean => {
    const rate = parseRateInput(text);
    if (rate == null || currency === 'USD') return false;
    void setManualRate(currency, rate).then(() => setMessage(`Cotización de ${currency} guardada.`));
    return true;
  };

  return (
    <ScreenScroll title="Tu perfil">
      <AccountCard name={user?.name ?? ''} email={user?.email ?? ''} />

      <PlanCard />

      <SyncCard />

      <SecurityCard />

      <RemindersCard />

      <Card>
        <Text variant="titleMedium">Moneda de visualización</Text>
        <Text variant="bodySmall" color={colors.onSurfaceVariant}>
          Los totales de todas las pantallas se muestran convertidos a esta moneda.
        </Text>
        <CurrencySelector selected={converter.target} onSelect={(c) => void setDisplayCurrency(c)} style={{ marginTop: 8 }} />
      </Card>

      <RatesCard isRefreshing={isRefreshing} message={message} onEdit={setEditingRate} onRefresh={onRefresh} />

      <CalculatorCard />

      <LegalCard />

      <AccountActions />

      {editingRate && (
        <EditRateDialog
          currency={editingRate}
          initial={(() => {
            const rate = rateOf(converter.rates, editingRate);
            return rate != null ? rateToInput(rate) : '';
          })()}
          onDismiss={() => setEditingRate(null)}
          onSave={(text) => {
            if (saveRate(editingRate, text)) setEditingRate(null);
          }}
        />
      )}
    </ScreenScroll>
  );
}

/** Términos, privacidad y contacto, que las tiendas piden tener a mano dentro de la app. */
function LegalCard() {
  const { colors } = useTheme();
  const open = (url: string) => () => void Linking.openURL(url);
  return (
    <Card>
      <Text variant="titleMedium">Privacidad y ayuda</Text>
      <Text variant="bodySmall" color={colors.onSurfaceVariant}>
        {`¿Dudas o problemas? Escribinos a ${SUPPORT_EMAIL}.`}
      </Text>
      <View style={{ marginTop: 8 }}>
        <TextButton text="Política de privacidad" onPress={open(LegalLinks.privacy)} />
        <Divider />
        <TextButton text="Términos y condiciones" onPress={open(LegalLinks.terms)} />
        <Divider />
        <TextButton text="Escribir a soporte" onPress={open(`mailto:${SUPPORT_EMAIL}?subject=Netto`)} />
      </View>
    </Card>
  );
}

/** Plan actual (gratis o Premium) y acceso a la pantalla de planes. */
function PlanCard() {
  const { colors } = useTheme();
  const { premium, until } = usePremium();
  return (
    <Card>
      <Text variant="titleMedium" header>
        {premium ? 'Tenés Netto Premium' : 'Plan gratis'}
      </Text>
      <Text variant="bodySmall" color={colors.onSurfaceVariant}>
        {premium && until != null
          ? `Activo hasta el ${numericEs(fromLocalDate(new Date(until)))}.`
          : 'Cargás facturas e ingresos, marcás pagos y ves tu saldo del mes. Con Premium sumás escaneo, avisos, ahorro y reportes.'}
      </Text>
      <TonalButton
        text={premium ? 'Ver mi plan' : 'Ver Premium'}
        icon="workspace-premium"
        onPress={goToPremium}
        style={{ marginTop: 12 }}
      />
    </Card>
  );
}

/** Con cuántos días de anticipación llega el primer aviso de cada factura. */
function RemindersCard() {
  const { colors } = useTheme();
  const { plan } = useAppData();
  const { premium } = usePremium();
  const days = plan.reminderDaysBefore;
  if (!premium) {
    return (
      <PremiumLocked
        icon="notifications-active"
        title="Avisos de vencimiento"
        description="Te avisamos unos días antes de que venza cada factura, el mismo día y al día siguiente si sigue sin pagar."
      />
    );
  }
  return (
    <Card>
      <Text variant="titleMedium" header>
        Avisos de vencimiento
      </Text>
      <Text variant="bodySmall" color={colors.onSurfaceVariant}>
        {`Te avisamos ${days === 1 ? '1 día' : `${days} días`} antes, el día del vencimiento y al día siguiente si sigue sin pagar.`}
      </Text>
      {/* En varias filas y no en una que se desliza: así la opción elegida siempre está a la vista. */}
      <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {REMINDER_DAY_OPTIONS.map((option) => (
          <Chip
            key={option}
            label={option === 1 ? '1 día' : `${option} días`}
            selected={option === days}
            onPress={() => void setReminderDaysBefore(option)}
          />
        ))}
      </View>
    </Card>
  );
}

function SecurityCard() {
  const { colors } = useTheme();
  const { biometrics, biometricUnlockEnabled, setBiometricUnlockEnabled } = useAppLock();
  return (
    <Card>
      <Text variant="titleMedium">Seguridad</Text>
      <Text variant="bodySmall" color={colors.onSurfaceVariant}>
        {`La app se bloquea después de ${LOCK_AFTER_MS / 60_000} minutos sin uso.`}
      </Text>
      {biometrics.available ? (
        <View style={{ marginTop: 8 }}>
          <SwitchRow
            label={`Desbloquear con ${biometrics.label}`}
            value={biometricUnlockEnabled}
            onValueChange={setBiometricUnlockEnabled}
          />
        </View>
      ) : (
        <Text variant="bodySmall" color={colors.onSurfaceVariant} style={{ marginTop: 8 }}>
          Para desbloquearla se usa la contraseña de tu cuenta. Si configurás Face ID o huella en el teléfono, vas a
          poder usarlos.
        </Text>
      )}
    </Card>
  );
}

function AccountCard({ name, email }: { name: string; email: string }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="titleMedium" color={colors.onPrimaryContainer}>
            {initialsOf(name)}
          </Text>
        </View>
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text variant="titleMedium">{name}</Text>
          <Text variant="bodySmall" color={colors.onSurfaceVariant}>
            {email}
          </Text>
        </View>
      </View>
      <TonalButton text="Editar perfil" icon="edit" onPress={() => router.push('/edit-profile')} style={{ marginTop: 12 }} />
    </Card>
  );
}

function RatesCard({
  isRefreshing,
  message,
  onEdit,
  onRefresh,
}: {
  isRefreshing: boolean;
  message: string | null;
  onEdit: (currency: CurrencyCode) => void;
  onRefresh: () => void;
}) {
  const { colors } = useTheme();
  const { rates } = useAppData();
  const updatedAt = rates.updatedAt;
  return (
    <Card>
      <Text variant="titleMedium">Cotizaciones</Text>
      <Text variant="bodySmall" color={colors.onSurfaceVariant}>
        Podés editarlas a mano, por ejemplo para usar el dólar blue o paralelo.
      </Text>

      <View style={{ marginTop: 8 }}>
        {CURRENCY_CODES.filter((c) => c !== 'USD').map((currency) => {
          const rate = rateOf(rates, currency);
          return (
            <View key={currency} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="bodyLarge" weight="semibold" style={{ flex: 1 }}>
                {`1 ${Currencies.USD.symbol} = ${rate != null ? formatRate(rate, currency) : 'sin cotización'}`}
              </Text>
              <IconButton icon="edit" label={`Editar cotización de ${Currencies[currency].label}`} onPress={() => onEdit(currency)} />
            </View>
          );
        })}
      </View>

      <Text variant="labelSmall" color={colors.onSurfaceVariant}>
        {updatedAt == null
          ? 'Todavía no se descargaron cotizaciones.'
          : rates.isManual
            ? `Editada a mano · ${timestampEs(updatedAt)}`
            : `Oficial · ${timestampEs(updatedAt)} · Fuente: ${RATES_SOURCE_NAME}`}
      </Text>

      <TonalButton
        text={isRefreshing ? 'Actualizando…' : 'Actualizar cotización oficial'}
        icon="sync"
        onPress={onRefresh}
        loading={isRefreshing}
        style={{ marginTop: 12 }}
      />
      {message && (
        <Text variant="bodySmall" color={colors.secondary} style={{ marginTop: 8 }}>
          {message}
        </Text>
      )}
    </Card>
  );
}

function CalculatorCard() {
  const { converter } = useAppData();
  const [text, setText] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const amount = parseAmount(currency, text);
  return (
    <Card>
      <Text variant="titleMedium">Calculadora de cambio</Text>
      <TextField
        label="Monto"
        value={text}
        onChangeText={(v) => setText(sanitizeAmountInput(currency, v))}
        prefix={Currencies[currency].symbol}
        keyboardType="decimal-pad"
        style={{ marginTop: 8 }}
      />
      <CurrencySelector
        selected={currency}
        onSelect={(c) => {
          setCurrency(c);
          setText((t) => sanitizeAmountInput(c, t));
        }}
        style={{ marginTop: 8 }}
      />
      {amount != null && (
        <View style={{ marginTop: 8, gap: 4 }}>
          {CURRENCY_CODES.filter((c) => c !== currency).map((target) => {
            const converted = converter.convert(amount, currency, target);
            return (
              <Text key={target} variant="titleMedium" weight="bold">
                {converted != null ? formatMoney(converted, target) : `${target}: falta la cotización`}
              </Text>
            );
          })}
        </View>
      )}
    </Card>
  );
}

function EditRateDialog({
  currency,
  initial,
  onDismiss,
  onSave,
}: {
  currency: CurrencyCode;
  initial: string;
  onDismiss: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <Dialog
      visible
      title={`Cotización de ${Currencies[currency].label.toLowerCase()}`}
      onDismiss={onDismiss}
      confirmText="Guardar"
      onConfirm={() => onSave(text)}
    >
      <Text variant="bodySmall">
        ¿Cuánto vale 1 {Currencies.USD.symbol}? Se reemplaza la próxima vez que actualices la cotización oficial.
      </Text>
      <TextField
        label="Cotización"
        value={text}
        onChangeText={(v) => setText(v.replace(/[^\d,.]/g, ''))}
        prefix={Currencies[currency].symbol}
        keyboardType="decimal-pad"
        autoFocus
      />
    </Dialog>
  );
}
