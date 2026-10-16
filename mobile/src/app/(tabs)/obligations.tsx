import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Currencies } from '@/domain/currency';
import { currentYearMonth, longEs, today } from '@/domain/dates';
import { formatAmount, formatMoney } from '@/domain/format';
import { dueLabel, obligationStatus } from '@/domain/models';
import { markAsPaid } from '@/data/repository';
import { OBLIGATION_FILTERS, obligationsState, type ObligationFilter, type ObligationsState } from '@/features/selectors';
import { useAppData } from '@/state/AppDataProvider';
import { ChipRow } from '@/ui/form';
import { ObligationCard } from '@/ui/ObligationCard';
import { Card, Dot, HeroAmount, HeroCard, Icon, IconBox, PrimaryButton, ScreenPadding, Tag, Text } from '@/ui/primitives';
import { Hero, Radius, useTheme } from '@/ui/theme';

export default function ObligationsListScreen() {
  const data = useAppData();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<ObligationFilter>('TODOS');
  const state = useMemo(() => obligationsState(data, filter), [data, filter]);

  return (
    <ScrollView contentContainerStyle={{ padding: ScreenPadding, gap: 16 }}>
      <CycleHero state={state} target={data.converter.target} />

      <ScanCard onScan={() => router.push('/scan')} />

      <ChipRow>
        {OBLIGATION_FILTERS.map(({ key, label }) => (
          <FilterPill key={key} text={`${label} (${state.counts[key] ?? 0})`} selected={filter === key} onPress={() => setFilter(key)} />
        ))}
      </ChipRow>

      {state.items.length === 0 && (
        <Card>
          <Text color={colors.onSurfaceVariant}>No hay facturas en esta categoría.</Text>
        </Card>
      )}

      {state.items.map(({ obligation, status }) => (
        <ObligationCard
          key={obligation.id}
          obligation={obligation}
          status={status}
          onPress={() => router.push({ pathname: '/obligation', params: { id: String(obligation.id) } })}
          onMarkPaid={() => void markAsPaid(obligation)}
          converter={data.converter}
        />
      ))}

      <Pressable
        onPress={() => router.push('/obligation')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 12,
          backgroundColor: colors.surface,
          paddingVertical: 16,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Icon name="add-circle-outline" size={20} />
        <Text variant="titleSmall" style={{ marginLeft: 8 }}>
          Agregar servicio manual
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function CycleHero({ state, target }: { state: ObligationsState; target: keyof typeof Currencies }) {
  const next = state.nextDue;
  return (
    <HeroCard>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Icon name="calendar-month" size={18} color={Hero.onColorMuted} />
        <Text variant="overline" color={Hero.onColorMuted} style={{ flex: 1, marginLeft: 6 }}>
          {longEs(currentYearMonth())}
        </Text>
        {state.activeCount > 0 && (
          <Tag
            text={`${state.activeCount} ${state.activeCount === 1 ? 'factura activa' : 'facturas activas'}`}
            container={Hero.tile}
            contentColor={Hero.onColor}
          />
        )}
      </View>
      <View>
        <Text color={Hero.onColorMuted}>Por pagar este mes</Text>
        <HeroAmount prefix={Currencies[target].symbol} amount={formatAmount(state.pendingThisMonth, target)} />
      </View>
      {next && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Dot color={Hero.highlight} />
          <Text variant="labelMedium" color={Hero.onColor} numberOfLines={1} style={{ flex: 1, marginHorizontal: 8 }}>
            {`Próximo: ${next.name}, ${dueLabel(next.dueDate, obligationStatus(next.dueDate, false, today()), today()).toLowerCase()}`}
          </Text>
          <Text variant="labelMedium" color={Hero.onColorMuted}>
            {formatMoney(next.amount, next.currency)}
          </Text>
        </View>
      )}
    </HeroCard>
  );
}

function ScanCard({ onScan }: { onScan: () => void }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <IconBox icon="document-scanner" container={colors.primaryContainer} size={48} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text variant="titleMedium">Escanear factura</Text>
          <Text variant="bodySmall" color={colors.onSurfaceVariant}>
            Sacale una foto o elegí una imagen. Detectamos automáticamente el monto y la fecha límite.
          </Text>
        </View>
      </View>
      <PrimaryButton text="Abrir escáner" icon="camera-alt" onPress={onScan} style={{ marginTop: 12 }} />
    </Card>
  );
}

function FilterPill({ text, selected, onPress }: { text: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        borderRadius: Radius.pill,
        backgroundColor: selected ? colors.primary : colors.surface,
        borderWidth: selected ? 0 : 1,
        borderColor: colors.outlineVariant,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <Text variant="labelLarge" weight={selected ? 'bold' : 'medium'} color={selected ? colors.onPrimary : colors.onSurface}>
        {text}
      </Text>
    </Pressable>
  );
}
