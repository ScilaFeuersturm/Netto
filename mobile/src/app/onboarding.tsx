import { useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';

import { COUNTRIES, Currencies, guessLocalCurrency, type CurrencyCode } from '@/domain/currency';
import { parseAmount, sanitizeAmountInput } from '@/domain/format';
import { BUDGET_MODELS, type BudgetModelType } from '@/domain/models';
import { addIncome, updateBudgetPlan } from '@/data/repository';
import { useAppData } from '@/state/AppDataProvider';
import { Chip, TextField } from '@/ui/form';
import { PrimaryButton, Text } from '@/ui/primitives';
import { ScreenScroll } from '@/ui/Screen';
import { Radius, useTheme } from '@/ui/theme';

/** Al terminar no hace falta navegar: la app pasa sola a la pantalla principal cuando el onboarding queda completo. */
export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { user } = useAppData();
  const firstName = user?.name.trim().split(' ')[0] ?? '';

  // El país define la moneda local: en el plan gratis es la única; con Premium se suman las demás.
  // Viene elegido según la zona horaria del teléfono; si no se puede deducir, lo elige la persona.
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode | null>(() => guessLocalCurrency());
  const [incomeName, setIncomeName] = useState('');
  const [incomeText, setIncomeText] = useState('');
  const incomeCurrency: CurrencyCode = displayCurrency ?? 'PYG';
  const [selectedModel, setSelectedModel] = useState<BudgetModelType>('RULE_50_30_20');
  const [isSaving, setSaving] = useState(false);

  const incomeAmount = parseAmount(incomeCurrency, incomeText);
  const skipsIncome = incomeName.trim() === '' && incomeText.trim() === '';
  /** El ingreso es opcional, pero si se empieza a cargar tiene que estar completo. */
  const isValid =
    !isSaving && displayCurrency != null && (skipsIncome || (incomeName.trim() !== '' && (incomeAmount ?? 0) > 0));

  const missingStep =
    displayCurrency == null
      ? 'Para empezar, elegí en qué país vivís (arriba de todo).'
      : !skipsIncome && incomeName.trim() === ''
        ? 'Completá el nombre del ingreso, o borrá el monto si preferís cargarlo después.'
        : !skipsIncome && !((incomeAmount ?? 0) > 0)
          ? 'Completá el monto del ingreso, o borrá el nombre si preferís cargarlo después.'
          : null;

  const onCountrySelect = (currency: CurrencyCode) => {
    setDisplayCurrency(currency);
    setIncomeText((text) => sanitizeAmountInput(currency, text));
  };

  const finish = async () => {
    if (!isValid || displayCurrency == null) return;
    Keyboard.dismiss();
    setSaving(true);
    if (incomeName.trim() !== '' && incomeAmount != null) {
      await addIncome({ name: incomeName.trim(), amount: incomeAmount, currency: incomeCurrency });
    }
    const model = BUDGET_MODELS.find((m) => m.type === selectedModel)!;
    await updateBudgetPlan((plan) => ({
      ...plan,
      modelType: model.type,
      necesidadesPercent: model.necesidadesPercent,
      deseosPercent: model.deseosPercent,
      ahorroPercent: model.ahorroPercent,
      displayCurrency,
      onboardingCompleted: true,
    }));
  };

  return (
    <ScreenScroll safeTop contentStyle={{ paddingHorizontal: 24, paddingTop: 32, gap: 20 }}>
      <View>
        <Text variant="headlineMedium" color={colors.primary} header>
          {firstName ? `¡Hola, ${firstName}!` : 'Bienvenido a Inariko'}
        </Text>
        <Text color={colors.onSurfaceVariant} style={{ marginTop: 6 }}>
          Configuremos tu cuenta en un minuto.
        </Text>
      </View>

      <View>
        <Text variant="titleMedium">¿En qué país vivís?</Text>
        <Text variant="bodySmall" color={colors.onSurfaceVariant}>
          Tus montos van a estar en la moneda de tu país. Con Premium podés sumar otras monedas.
        </Text>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {COUNTRIES.map((country) => (
            <Chip
              key={country.code}
              label={`${country.name} (${Currencies[country.currency].symbol})`}
              selected={displayCurrency === country.currency}
              onPress={() => onCountrySelect(country.currency)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <View>
          <Text variant="titleMedium">Tu ingreso mensual (opcional)</Text>
          <Text variant="bodySmall" color={colors.onSurfaceVariant}>
            Si preferís, cargalo después desde Inicio → Ingresos.
          </Text>
        </View>
        <TextField label="Nombre (ej. Sueldo)" testID="onboarding-income-name" value={incomeName} onChangeText={setIncomeName} />
        <TextField
          label={`Monto en ${Currencies[incomeCurrency].label.toLowerCase()}`}
          testID="onboarding-income-amount"
          value={incomeText}
          onChangeText={(v) => setIncomeText(sanitizeAmountInput(incomeCurrency, v))}
          prefix={Currencies[incomeCurrency].symbol}
          keyboardType="decimal-pad"
        />
      </View>

      <View>
        <Text variant="titleMedium">Elegí un modelo de ahorro para empezar</Text>
        <Text variant="bodySmall" color={colors.onSurfaceVariant}>
          Podés cambiarlo cuando quieras desde la pestaña Ahorro.
        </Text>
      </View>

      {BUDGET_MODELS.map((model) => {
        const selected = model.type === selectedModel;
        return (
          <Pressable
            key={model.type}
            onPress={() => setSelectedModel(model.type)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              borderRadius: Radius.md,
              backgroundColor: selected ? colors.primaryContainer : colors.surface,
            }}
          >
            <RadioDot selected={selected} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text weight="semibold">{model.title}</Text>
              <Text variant="bodySmall" color={colors.onSurfaceVariant}>
                {model.description}
              </Text>
            </View>
          </Pressable>
        );
      })}

      {/* Si el botón está desactivado, se dice por qué (si no, parece que la app no responde). */}
      {!isSaving && missingStep && (
        <Text variant="bodySmall" color={colors.onSurfaceVariant} accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
          {missingStep}
        </Text>
      )}
      <PrimaryButton text="Empezar" onPress={finish} disabled={!isValid} loading={isSaving} />
    </ScreenScroll>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  const { colors } = useTheme();
  const color = selected ? colors.primary : colors.onSurfaceVariant;
  return (
    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />}
    </View>
  );
}
