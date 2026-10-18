import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Currencies, type CurrencyCode } from '@/domain/currency';
import { currentYearMonth, longEs } from '@/domain/dates';
import { formatAmount, formatMoney } from '@/domain/format';
import { BUDGET_MODELS, type BudgetModel, type BudgetModelType, type BudgetPlan } from '@/domain/models';
import { selectBudgetModel } from '@/data/repository';
import { budgetState, type BudgetState } from '@/features/selectors';
import { useAppData } from '@/state/AppDataProvider';
import { TextField } from '@/ui/form';
import {
  AlertBanner, Card, Dot, HeroAmount, HeroCard, HeroTile, Icon, IconBox, PrimaryButton, ProgressBar, ScreenPadding, Tag, Text,
} from '@/ui/primitives';
import { Hero, useTheme } from '@/ui/theme';

const MODEL_ICONS: Record<BudgetModelType, string> = {
  RULE_50_30_20: 'pie-chart',
  RULE_70_20_10: 'balance',
  PAY_YOURSELF_FIRST: 'savings',
  CUSTOM: 'tune',
};

export default function BudgetScreen() {
  const data = useAppData();
  const { plan } = data;
  const currency = data.converter.target;
  const { colors } = useTheme();
  const state = useMemo(() => budgetState(data), [data]);
  const activeModel = BUDGET_MODELS.find((m) => m.type === plan.modelType) ?? BUDGET_MODELS[0];
  const manageIncome = () => router.push('/income');
  const bucketColors = { necesidades: colors.primary, deseos: colors.tertiary, ahorro: colors.secondary };

  return (
    <ScrollView contentContainerStyle={{ padding: ScreenPadding, gap: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, gap: 6, alignItems: 'flex-start' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 999,
              backgroundColor: colors.primaryContainer,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Icon name="auto-awesome" size={12} color={colors.onPrimaryContainer} />
            <Text variant="labelMedium" color={colors.onPrimaryContainer} style={{ marginLeft: 4 }}>
              {activeModel.title}
            </Text>
          </View>
          <Text variant="headlineMedium" color={colors.onBackground}>
            Estrategia de ahorro
          </Text>
        </View>
        <Pressable
          onPress={manageIncome}
          accessibilityLabel="Gestionar ingresos"
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="tune" />
        </Pressable>
      </View>

      {state.totalIncome === 0 && (
        <Card onPress={manageIncome}>
          <Text variant="titleSmall">Todavía no cargaste tu ingreso mensual.</Text>
          <Text variant="bodySmall" color={colors.onSurfaceVariant} style={{ marginTop: 4 }}>
            Cargalo para que Netto pueda calcular cuánto asignar a cada modelo de ahorro.
          </Text>
          <Text variant="labelLarge" color={colors.secondary} style={{ marginTop: 8 }}>
            Ir a Ingresos →
          </Text>
        </Card>
      )}

      <SavingsHero state={state} plan={plan} currency={currency} onManageIncome={manageIncome} />

      <IncomeDistributionCard state={state} plan={plan} currency={currency} bucketColors={bucketColors} />

      <Card>
        <Text variant="titleLarge">Progreso este mes</Text>
        <Text variant="bodySmall" color={colors.onSurfaceVariant}>
          Gastos del mes contra lo asignado a cada grupo
        </Text>
        <View style={{ marginTop: 16, gap: 16 }}>
          <BudgetProgressBar
            label="Necesidades"
            spent={state.necesidadesSpent}
            allocated={state.necesidadesAllocated}
            currency={currency}
            color={bucketColors.necesidades}
          />
          <BudgetProgressBar
            label="Deseos"
            spent={state.deseosSpent}
            allocated={state.deseosAllocated}
            currency={currency}
            color={bucketColors.deseos}
          />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Icon name="auto-awesome" color={colors.onBackground} />
        <Text variant="titleLarge" style={{ flex: 1, marginLeft: 8 }} color={colors.onBackground}>
          Modelos sugeridos
        </Text>
        <Tag text={`${BUDGET_MODELS.length} opciones`} />
      </View>

      {BUDGET_MODELS.map((model) => (
        <BudgetModelCard
          key={model.type}
          model={model}
          selected={plan.modelType === model.type}
          onSelect={() => void selectBudgetModel(model.type, model)}
        />
      ))}

      {plan.modelType === 'CUSTOM' && (
        // La key reinicia los campos cuando cambian los porcentajes guardados.
        <CustomPercentEditor key={`${plan.necesidadesPercent}-${plan.deseosPercent}-${plan.ahorroPercent}`} plan={plan} />
      )}
    </ScrollView>
  );
}

/** Barra de progreso de un balde de presupuesto (necesidades/deseos/ahorro): gastado vs. asignado. */
function BudgetProgressBar({
  label,
  spent,
  allocated,
  currency,
  color,
}: {
  label: string;
  spent: number;
  allocated: number;
  currency: CurrencyCode;
  color: string;
}) {
  const { colors } = useTheme();
  const fraction = allocated <= 0 ? 0 : spent / allocated;
  const isOver = spent > allocated;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Dot color={color} />
        <Text style={{ flex: 1, marginLeft: 8 }}>{label}</Text>
        <Text weight="bold" color={isOver ? colors.error : colors.onSurface}>
          {formatMoney(spent, currency)}
        </Text>
        <Text variant="labelSmall" color={colors.onSurfaceVariant}>
          {` / ${formatMoney(allocated, currency)}`}
        </Text>
      </View>
      <ProgressBar fraction={fraction} color={isOver ? colors.error : color} height={8} />
    </View>
  );
}

function SavingsHero({
  state,
  plan,
  currency,
  onManageIncome,
}: {
  state: BudgetState;
  plan: BudgetPlan;
  currency: CurrencyCode;
  onManageIncome: () => void;
}) {
  const progress = state.ahorroGoal <= 0 ? 0 : Math.min(1, Math.max(0, state.ahorroReal / state.ahorroGoal));
  return (
    <HeroCard>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="trending-up" size={16} color={Hero.onColorMuted} />
            <Text variant="bodySmall" color={Hero.onColorMuted} style={{ marginLeft: 6 }}>
              Capacidad de ahorro de este mes
            </Text>
          </View>
          <HeroAmount prefix={Currencies[currency].symbol} amount={formatAmount(state.ahorroReal, currency)} />
        </View>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: Hero.tile, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="savings" color={Hero.onColor} />
        </View>
      </View>

      <HeroTile>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Dot color={Hero.positive} />
          <Text variant="titleSmall" color={Hero.onColor} style={{ flex: 1, marginLeft: 8 }}>
            Meta de ahorro ({plan.ahorroPercent}%)
          </Text>
          <Text variant="labelMedium" color={Hero.positive}>
            {Math.trunc(progress * 100)}% completado
          </Text>
        </View>
        <ProgressBar fraction={progress} color={Hero.positive} trackColor="rgba(0,0,0,0.25)" style={{ marginVertical: 10 }} />
        <View style={{ flexDirection: 'row' }}>
          <Text variant="labelSmall" color={Hero.onColorMuted} style={{ flex: 1 }}>
            Actual: {formatMoney(state.ahorroReal, currency)}
          </Text>
          <Text variant="labelSmall" color={Hero.onColorMuted}>
            Meta: {formatMoney(state.ahorroGoal, currency)}
          </Text>
        </View>
      </HeroTile>

      <Pressable onPress={onManageIncome} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
        <Text variant="labelMedium" color={Hero.onColorMuted} style={{ flex: 1 }}>
          Ingreso mensual: {formatMoney(state.totalIncome, currency)}
        </Text>
        <Text variant="labelMedium" color={Hero.onColor}>
          Gestionar ingresos
        </Text>
        <Icon name="keyboard-arrow-right" size={16} color={Hero.onColor} />
      </Pressable>
    </HeroCard>
  );
}

function IncomeDistributionCard({
  state,
  plan,
  currency,
  bucketColors,
}: {
  state: BudgetState;
  plan: BudgetPlan;
  currency: CurrencyCode;
  bucketColors: { necesidades: string; deseos: string; ahorro: string };
}) {
  const { colors } = useTheme();
  const segments = [
    { percent: plan.necesidadesPercent, color: bucketColors.necesidades },
    { percent: plan.deseosPercent, color: bucketColors.deseos },
    { percent: plan.ahorroPercent, color: bucketColors.ahorro },
  ].filter((s) => s.percent > 0);

  const overNecesidades = state.necesidadesSpent - state.necesidadesAllocated;
  const overDeseos = state.deseosSpent - state.deseosAllocated;
  const note =
    state.totalIncome === 0
      ? null
      : overNecesidades > 0
        ? `Tus necesidades de este mes superan lo asignado por ${formatMoney(overNecesidades, currency)}, y eso reduce tu margen de ahorro.`
        : overDeseos > 0
          ? `Tus deseos de este mes superan lo asignado por ${formatMoney(overDeseos, currency)}. Revisá qué podés posponer.`
          : null;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text variant="titleLarge">Distribución de ingresos</Text>
          <Text variant="bodySmall" color={colors.onSurfaceVariant}>
            Cómo se reparte tu ingreso según tu modelo
          </Text>
        </View>
        <Tag
          text={longEs(currentYearMonth())}
          container={colors.surfaceVariant}
          contentColor={colors.onSurface}
          style={{ marginLeft: 8 }}
        />
      </View>

      <View style={{ flexDirection: 'row', marginVertical: 16, height: 10, gap: 3 }}>
        {segments.map((s, i) => (
          <View key={i} style={{ flex: s.percent, height: 10, borderRadius: 5, backgroundColor: s.color }} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <DistributionLegend label="Necesidades" percent={plan.necesidadesPercent} amount={formatMoney(state.necesidadesAllocated, currency)} color={bucketColors.necesidades} />
        <DistributionLegend label="Deseos" percent={plan.deseosPercent} amount={formatMoney(state.deseosAllocated, currency)} color={bucketColors.deseos} />
        <DistributionLegend label="Ahorro" percent={plan.ahorroPercent} amount={formatMoney(state.ahorroGoal, currency)} color={bucketColors.ahorro} />
      </View>

      {note && <AlertBanner message={note} icon="info-outline" style={{ marginTop: 16 }} />}
    </Card>
  );
}

function DistributionLegend({ label, percent, amount, color }: { label: string; percent: number; amount: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Dot color={color} />
        <Text variant="labelMedium" style={{ marginLeft: 6 }}>
          {label}
        </Text>
      </View>
      <Text variant="headlineSmall" weight="bold">
        {percent}%
      </Text>
      <Text variant="labelSmall" color={colors.onSurfaceVariant} numberOfLines={1} adjustsFontSizeToFit>
        {amount}
      </Text>
    </View>
  );
}

function BudgetModelCard({ model, selected, onSelect }: { model: BudgetModel; selected: boolean; onSelect: () => void }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <IconBox icon={MODEL_ICONS[model.type]} container={selected ? colors.primaryContainer : colors.secondaryContainer} />
        <View style={{ flex: 1, marginLeft: 12, gap: 2 }}>
          <Text variant="titleMedium">{model.title}</Text>
          <Text variant="bodySmall" color={colors.onSurfaceVariant}>
            {model.description}
          </Text>
          <Text variant="labelSmall" color={colors.outline}>
            {model.source}
          </Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 12,
          borderRadius: 10,
          backgroundColor: colors.surfaceVariant,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="labelSmall" color={colors.onSurfaceVariant}>
            Reparto
          </Text>
          <Text variant="titleSmall" weight="bold">
            {`${model.necesidadesPercent} / ${model.deseosPercent} / ${model.ahorroPercent}`}
          </Text>
        </View>
        {selected ? <Tag text="Activo" /> : <PrimaryButton text="Activar" onPress={onSelect} compact />}
      </View>
    </Card>
  );
}

function CustomPercentEditor({ plan }: { plan: BudgetPlan }) {
  const { colors } = useTheme();
  const [necesidades, setNecesidades] = useState(String(plan.necesidadesPercent));
  const [deseos, setDeseos] = useState(String(plan.deseosPercent));
  const [ahorro, setAhorro] = useState(String(plan.ahorroPercent));

  const digits = (setter: (v: string) => void) => (v: string) => setter(v.replace(/\D/g, ''));
  const sum = (Number(necesidades) || 0) + (Number(deseos) || 0) + (Number(ahorro) || 0);

  return (
    <Card>
      <View style={{ gap: 10 }}>
        <Text variant="titleMedium">Personalizar porcentajes</Text>
        <TextField label="Necesidades %" value={necesidades} onChangeText={digits(setNecesidades)} keyboardType="number-pad" />
        <TextField label="Deseos %" value={deseos} onChangeText={digits(setDeseos)} keyboardType="number-pad" />
        <TextField label="Ahorro %" value={ahorro} onChangeText={digits(setAhorro)} keyboardType="number-pad" />
        <Text variant="bodySmall" color={sum === 100 ? colors.secondary : colors.error}>
          {sum === 100 ? 'Suma: 100% ✓' : `Suma: ${sum}% (debe ser 100%)`}
        </Text>
        <PrimaryButton
          text="Guardar porcentajes"
          disabled={sum !== 100}
          onPress={() =>
            void selectBudgetModel('CUSTOM', {
              necesidadesPercent: Number(necesidades) || 0,
              deseosPercent: Number(deseos) || 0,
              ahorroPercent: Number(ahorro) || 0,
            })
          }
        />
      </View>
    </Card>
  );
}
