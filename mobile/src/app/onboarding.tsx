import { useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';

import { Currencies, type CurrencyCode } from '@/domain/currency';
import { parseAmount, sanitizeAmountInput } from '@/domain/format';
import { BUDGET_MODELS, type BudgetModelType } from '@/domain/models';
import { addIncome, updateBudgetPlan } from '@/data/repository';
import { useAppData } from '@/state/AppDataProvider';
import { CurrencySelector, TextField } from '@/ui/form';
import { PrimaryButton, Text } from '@/ui/primitives';
import { ScreenScroll } from '@/ui/Screen';
import { Radius, useTheme } from '@/ui/theme';

/** Al terminar no hace falta navegar: la app pasa sola a la pantalla principal cuando el onboarding queda completo. */
export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { user } = useAppData();
  const firstName = user?.name.trim().split(' ')[0] ?? '';

  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>('PYG');
  const [incomeName, setIncomeName] = useState('');
  const [incomeText, setIncomeText] = useState('');
  const [incomeCurrency, setIncomeCurrency] = useState<CurrencyCode>('PYG');
  const [selectedModel, setSelectedModel] = useState<BudgetModelType>('RULE_50_30_20');
  const [isSaving, setSaving] = useState(false);

  const incomeAmount = parseAmount(incomeCurrency, incomeText);
  const skipsIncome = incomeName.trim() === '' && incomeText.trim() === '';
  /** El ingreso es opcional, pero si se empieza a cargar tiene que estar completo. */
  const isValid = !isSaving && (skipsIncome || (incomeName.trim() !== '' && (incomeAmount ?? 0) > 0));

  const onDisplayCurrencySelect = (currency: CurrencyCode) => {
    // Mientras no se haya elegido otra, la moneda del ingreso acompaña a la principal.
    const nextIncomeCurrency = incomeCurrency === displayCurrency ? currency : incomeCurrency;
    setDisplayCurrency(currency);
    setIncomeCurrency(nextIncomeCurrency);
    setIncomeText((text) => sanitizeAmountInput(nextIncomeCurrency, text));
  };

  const finish = async () => {
    if (!isValid) return;
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
        <Text variant="headlineMedium" color={colors.primary}>
          {firstName ? `¡Hola, ${firstName}!` : 'Bienvenido a Netto'}
        </Text>
        <Text color={colors.onSurfaceVariant} style={{ marginTop: 6 }}>
          Configuremos tu cuenta en un minuto. Podés cambiar todo esto más adelante.
        </Text>
      </View>

      <View>
        <Text variant="titleMedium">¿En qué moneda querés ver tus totales?</Text>
        <Text variant="bodySmall" color={colors.onSurfaceVariant}>
          Cada ingreso y factura guarda su propia moneda; los totales se convierten a esta.
        </Text>
        <CurrencySelector selected={displayCurrency} onSelect={onDisplayCurrencySelect} style={{ marginTop: 8 }} />
      </View>

      <View style={{ gap: 8 }}>
        <View>
          <Text variant="titleMedium">Tu ingreso mensual (opcional)</Text>
          <Text variant="bodySmall" color={colors.onSurfaceVariant}>
            Si preferís, cargalo después desde Ahorro → Gestionar ingresos.
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
        <CurrencySelector
          selected={incomeCurrency}
          onSelect={(c) => {
            setIncomeCurrency(c);
            setIncomeText((text) => sanitizeAmountInput(c, text));
          }}
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
            accessibilityState={{ selected }}
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
