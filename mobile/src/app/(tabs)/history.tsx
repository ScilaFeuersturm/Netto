import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Currencies, type CurrencyCode } from '@/domain/currency';
import { currentYearMonth, longEs, shortEs, ymKey, type YearMonth } from '@/domain/dates';
import { formatAmount, formatMoney, spokenMoneyText } from '@/domain/format';
import { CATEGORIES } from '@/domain/models';
import { reportsState, type ReportsState } from '@/features/selectors';
import { useAppData } from '@/state/AppDataProvider';
import { Card, Dot, HeroAmount, HeroCard, HeroTile, Icon, IconBox, ProgressBar, ScreenPadding, Tag, Text, TonalButton } from '@/ui/primitives';
import { Hero, useTheme } from '@/ui/theme';

/** Pantalla "Reportes": flujo neto del mes, distribución de gastos por categoría e historial de pagos. */
export default function HistoryScreen() {
  const data = useAppData();
  const [selectedMonth, setSelectedMonth] = useState<YearMonth>(currentYearMonth);
  const state = useMemo(() => reportsState(data, selectedMonth), [data, selectedMonth]);
  const currency = data.converter.target;

  // Con muchos meses, el elegido (al inicio, el actual) puede quedar fuera de pantalla.
  const monthsRef = useRef<ScrollView>(null);
  const pillOffsets = useRef<Record<number, number>>({});
  const [laidOut, setLaidOut] = useState(0);
  useEffect(() => {
    const x = pillOffsets.current[ymKey(selectedMonth)];
    if (x != null) monthsRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.months.length, laidOut]);

  return (
    <ScrollView contentContainerStyle={{ padding: ScreenPadding, gap: 16 }}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="calendar-month" size={20} />
          <Text variant="titleMedium" style={{ flex: 1, marginLeft: 6 }}>
            Período
          </Text>
          {state.totalExpenses > 0 && <Tag text={`${state.paidPercent}% pagado`} />}
        </View>
        <ScrollView ref={monthsRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {state.months.map((month) => (
            <View
              key={ymKey(month)}
              onLayout={(e) => {
                pillOffsets.current[ymKey(month)] = e.nativeEvent.layout.x;
                setLaidOut((n) => n + 1);
              }}
            >
              <MonthPill month={month} selected={ymKey(month) === ymKey(selectedMonth)} onPress={() => setSelectedMonth(month)} />
            </View>
          ))}
        </ScrollView>
      </View>

      <NetFlowHero state={state} currency={currency} />
      <ExpenseDistributionCard state={state} currency={currency} />
      <PaymentHistoryCard state={state} month={selectedMonth} />

      <TonalButton text="Registrar nuevo gasto" icon="add-circle-outline" onPress={() => router.push('/obligation')} />
    </ScrollView>
  );
}

function MonthPill({ month, selected, onPress }: { month: YearMonth; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: selected ? colors.primary : colors.surfaceVariant,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <Text variant="labelLarge" color={selected ? colors.onPrimary : colors.onSurface}>
        {longEs(month)}
      </Text>
      {selected && (
        <View style={{ marginLeft: 6 }}>
          <Icon name="check" size={16} color={colors.onPrimary} />
        </View>
      )}
    </Pressable>
  );
}

function NetFlowHero({ state, currency }: { state: ReportsState; currency: CurrencyCode }) {
  const positive = state.netFlow >= 0;
  return (
    <HeroCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, columnGap: 8 }}>
        <Text variant="overline" color={Hero.onColorMuted} style={{ flexGrow: 1, flexShrink: 1, minWidth: '55%' }}>
          Ingresos menos pagos del mes
        </Text>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: Hero.tile, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={positive ? 'trending-up' : 'trending-down'} color={Hero.onColor} />
        </View>
      </View>
      <HeroAmount prefix={(positive ? '+' : '-') + Currencies[currency].symbol} amount={formatAmount(state.netFlow, currency)} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <FlowTile
          icon="arrow-downward"
          label="Total ingresos"
          value={formatMoney(state.totalIncome, currency)}
          caption="Ingreso mensual"
          captionColor={Hero.positive}
        />
        <FlowTile
          icon="arrow-upward"
          label="Total egresos"
          value={formatMoney(state.totalExpenses, currency)}
          caption={`${state.expensesPercentOfIncome}% del ingreso`}
          captionColor={Hero.highlight}
        />
      </View>
    </HeroCard>
  );
}

function FlowTile({
  icon,
  label,
  value,
  caption,
  captionColor,
}: {
  icon: string;
  label: string;
  value: string;
  caption: string;
  captionColor: string;
}) {
  return (
    <HeroTile
      style={{ flex: 1 }}
      accessible
      accessibilityLabel={`${label}: ${spokenMoneyText(value) ?? value}. ${caption}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Icon name={icon} size={14} color={Hero.onColorMuted} />
        <Text variant="labelSmall" color={Hero.onColorMuted} style={{ marginLeft: 4 }}>
          {label}
        </Text>
      </View>
      <Text variant="titleMedium" weight="bold" color={Hero.onColor} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      <Text variant="labelSmall" color={captionColor}>
        {caption}
      </Text>
    </HeroTile>
  );
}

function ExpenseDistributionCard({ state, currency }: { state: ReportsState; currency: CurrencyCode }) {
  const { colors } = useTheme();
  const palette = [colors.primary, colors.secondary, colors.onSurfaceVariant, colors.tertiary, colors.outline];
  const n = state.categories.length;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', rowGap: 6, columnGap: 8 }}>
        <View style={{ flexGrow: 1, flexShrink: 1, minWidth: '60%' }}>
          <Text variant="titleLarge" header>Distribución de gastos</Text>
          <Text variant="bodySmall" color={colors.onSurfaceVariant}>
            Desglose de {formatMoney(state.totalExpenses, currency)} del mes
          </Text>
        </View>
        {n > 0 && (
          <Tag
            text={`${n} ${n === 1 ? 'categoría' : 'categorías'}`}
            container={colors.surfaceVariant}
            contentColor={colors.secondary}
            style={{ marginLeft: 8 }}
          />
        )}
      </View>

      {n === 0 && (
        <Text color={colors.onSurfaceVariant} style={{ marginTop: 16 }}>
          No hay gastos registrados en este período.
        </Text>
      )}

      <View style={{ marginTop: 16, gap: 14 }}>
        {state.categories.map((share, index) => {
          const color = palette[index % palette.length];
          return (
            <View key={share.category} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Dot color={color} />
                <Text numberOfLines={2} style={{ flex: 1, marginHorizontal: 8 }}>
                  {CATEGORIES[share.category].label}
                </Text>
                <Text weight="bold">{formatMoney(share.amount, currency)}</Text>
                <Text variant="labelSmall" color={colors.onSurfaceVariant} style={{ marginLeft: 8 }}>
                  {share.percent}%
                </Text>
              </View>
              <ProgressBar fraction={share.percent / 100} color={color} height={8} />
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function PaymentHistoryCard({ state, month }: { state: ReportsState; month: YearMonth }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Icon name="history" color={colors.onSurfaceVariant} />
        <Text variant="titleLarge" style={{ flex: 1, marginLeft: 8 }} header>
          Historial de pagos
        </Text>
        <Text variant="labelMedium" color={colors.onSurfaceVariant}>
          {longEs(month)}
        </Text>
      </View>

      {state.payments.length === 0 && (
        <Text color={colors.onSurfaceVariant} style={{ marginTop: 12 }}>
          Todavía no registraste pagos en este período.
        </Text>
      )}

      <View style={{ marginTop: 12, gap: 10 }}>
        {state.payments.map((entry) => (
          <View
            key={entry.id}
            style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: colors.surfaceVariant, padding: 12 }}
          >
            <IconBox icon={CATEGORIES[entry.category].icon} container={colors.primaryContainer} size={40} />
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <Text variant="titleSmall" numberOfLines={2}>
                {entry.obligationName}
              </Text>
              <Text variant="labelSmall" color={colors.onSurfaceVariant}>
                Pagado el {shortEs(entry.paidDate)}
              </Text>
            </View>
            <Text variant="titleSmall" weight="bold">
              {formatMoney(entry.amount, entry.currency)}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
