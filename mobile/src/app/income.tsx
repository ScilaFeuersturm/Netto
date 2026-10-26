import { useState } from 'react';
import { Keyboard, View } from 'react-native';

import { Currencies, type CurrencyCode } from '@/domain/currency';
import { formatMoney, parseAmount, sanitizeAmountInput } from '@/domain/format';
import { addIncome, deleteIncome } from '@/data/repository';
import { useAppData } from '@/state/AppDataProvider';
import { CurrencySelector, TextField } from '@/ui/form';
import { Card, IconButton, PrimaryButton, Text } from '@/ui/primitives';
import { ScreenScroll } from '@/ui/Screen';
import { useTheme } from '@/ui/theme';
import { usePremium } from '@/data/premium';
import { useHousehold } from '@/data/household';
import { currentUserId } from '@/data/session';
import { SharedTag, ShareWithHousehold } from '@/features/Household';

export default function IncomeScreen() {
  const { colors } = useTheme();
  const { premium } = usePremium();
  const { incomes, converter } = useAppData();
  const household = useHousehold();
  const total = converter.sumOf(incomes);

  // El formulario arranca en la moneda de visualización del usuario.
  const emptyForm = () => ({
    name: '',
    amountText: '',
    currency: converter.target as CurrencyCode,
    dayOfMonth: '1',
    shared: false,
  });
  const [form, setForm] = useState(emptyForm);
  const amount = parseAmount(form.currency, form.amountText);
  const isValid = form.name.trim() !== '' && (amount ?? 0) > 0;

  const add = async () => {
    if (!isValid || amount == null) return;
    Keyboard.dismiss();
    const day = Number(form.dayOfMonth);
    await addIncome({
      name: form.name.trim(),
      amount,
      currency: form.currency,
      dayOfMonth: Number.isInteger(day) && day > 0 ? Math.min(31, day) : 1,
      householdId: form.shared && household ? household.id : null,
    });
    setForm(emptyForm());
  };

  return (
    <ScreenScroll title="Tus ingresos" contentStyle={{ paddingHorizontal: 20, gap: 14 }}>
      <Card>
        <Text color={colors.onSurfaceVariant}>Ingreso mensual total</Text>
        <Text variant="headlineSmall" weight="bold">
          {formatMoney(total, converter.target)}
        </Text>
      </Card>

      {incomes.map((income) => {
        const converted = income.currency !== converter.target ? converter.convert(income.amount, income.currency) : null;
        return (
          <View key={income.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text weight="medium" variant="bodyLarge">
                {income.name}
              </Text>
              <Text variant="bodySmall" color={colors.onSurfaceVariant}>
                Día {income.dayOfMonth} de cada mes
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                <SharedTag ownerId={income.userId} householdId={income.householdId} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text weight="bold" variant="bodyLarge">
                {formatMoney(income.amount, income.currency)}
              </Text>
              {converted != null && (
                <Text variant="labelSmall" color={colors.onSurfaceVariant}>
                  ≈ {formatMoney(converted, converter.target)}
                </Text>
              )}
            </View>
            {/* Solo quien cargó el ingreso lo puede borrar, aunque esté compartido. */}
            {income.userId === currentUserId() && (
              <IconButton
                icon="delete"
                label={`Eliminar ${income.name}`}
                color={colors.error}
                onPress={() => void deleteIncome(income.id)}
              />
            )}
          </View>
        );
      })}

      <Card>
        <View style={{ gap: 10 }}>
          <Text weight="semibold" variant="bodyLarge">
            Agregar fuente de ingreso
          </Text>
          <TextField label="Nombre (ej. Sueldo)" testID="income-name" value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} />
          <TextField
            label="Monto mensual"
            testID="income-amount"
            value={form.amountText}
            onChangeText={(v) => setForm((f) => ({ ...f, amountText: sanitizeAmountInput(f.currency, v) }))}
            prefix={Currencies[form.currency].symbol}
            keyboardType="decimal-pad"
          />
          {/* Varias monedas es Premium: en el plan gratis todo va en la moneda del país. */}
          {premium && (
            <CurrencySelector
              selected={form.currency}
              onSelect={(currency) => setForm((f) => ({ ...f, currency, amountText: sanitizeAmountInput(currency, f.amountText) }))}
            />
          )}
          <TextField
            label="Día de cobro (1-31)"
            value={form.dayOfMonth}
            onChangeText={(v) => setForm((f) => ({ ...f, dayOfMonth: v.replace(/\D/g, '').slice(0, 2) }))}
            keyboardType="number-pad"
          />
          <ShareWithHousehold value={form.shared} onChange={(shared) => setForm((f) => ({ ...f, shared }))} testID="income-shared" />
          <PrimaryButton text="Agregar" onPress={add} disabled={!isValid} />
        </View>
      </Card>
    </ScreenScroll>
  );
}
