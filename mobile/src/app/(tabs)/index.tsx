import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Currencies } from '@/domain/currency';
import { shortEs, today } from '@/domain/dates';
import { formatAmount, formatMoney, spokenMoneyText } from '@/domain/format';
import { CATEGORIES, obligationStatus, type PaymentHistoryEntry } from '@/domain/models';
import { markAsPaid } from '@/data/repository';
import { dashboardState, headerState, type DashboardState } from '@/features/selectors';
import { useAppData } from '@/state/AppDataProvider';
import { ObligationCard } from '@/ui/ObligationCard';
import {
  AlertBanner, Card, Divider, Dot, HeroAmount, HeroCard, HeroTile, Icon, IconBox, ScreenPadding, SectionHeader, Tag, Text,
} from '@/ui/primitives';
import { Hero, useTheme } from '@/ui/theme';

export default function DashboardScreen() {
  const data = useAppData();
  const { colors } = useTheme();
  const state = dashboardState(data);
  const { firstName } = headerState(data);
  const currency = data.converter.target;
  const pendingCount = state.vencidosCount + state.proximosCount;
  const now = today();

  const goToObligations = () => router.navigate('/obligations');
  const goToReports = () => router.navigate('/history');
  const addObligation = () => router.push('/obligation');

  return (
    <ScrollView contentContainerStyle={{ padding: ScreenPadding, gap: 16 }}>
      <Greeting userName={firstName} hasAlerts={state.vencidosCount > 0} onBellPress={goToObligations} />

      <BalanceHero state={state} currency={currency} />

      {state.isOverBudget && (
        <AlertBanner
          critical
          icon="warning-amber"
          message={`Tus gastos de este mes superan tu ingreso por ${formatMoney(state.overBudgetAmount, currency)}. Revisá qué podés mover o posponer.`}
        />
      )}

      <View style={{ gap: 12 }}>
        <SectionHeader title="Acciones rápidas" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <QuickAction icon="document-scanner" title="Escanear" highlighted onPress={() => router.push('/scan')} />
          <QuickAction icon="add-circle-outline" title="Registrar" onPress={addObligation} />
          <QuickAction icon="ios-share" title="Reporte" onPress={goToReports} />
        </View>
      </View>

      <SectionHeader title="Vencimientos" count={pendingCount} actionText="Ver agenda completa" onAction={goToObligations} />

      {state.dueThisWeekCount > 0 && (
        <AlertBanner
          message={`Tenés ${state.dueThisWeekCount} ${state.dueThisWeekCount > 1 ? 'facturas' : 'factura'} por pagar esta semana.`}
        />
      )}

      {state.upcoming.length === 0 && (
        <Card>
          <Text color={colors.onSurfaceVariant}>
            Todavía no cargaste ningún pago. Tocá &quot;Registrar&quot; o &quot;Escanear&quot; para empezar.
          </Text>
        </Card>
      )}

      {state.upcoming.slice(0, 3).map((obligation, index) => (
        <ObligationCard
          key={obligation.id}
          obligation={obligation}
          status={obligationStatus(obligation.dueDate, false, now)}
          onPress={() => router.push({ pathname: '/obligation', params: { id: String(obligation.id) } })}
          onMarkPaid={() => void markAsPaid(obligation)}
          converter={data.converter}
          emphasized={index === 0}
        />
      ))}

      {state.recentPayments.length > 0 && (
        <>
          <SectionHeader title="Actividad reciente" actionText="Historial completo" onAction={goToReports} />
          <RecentActivity payments={state.recentPayments} />
        </>
      )}

      {state.userHasData && <PaidProgressCard percent={state.paidThisMonthPercent} />}
    </ScrollView>
  );
}

function Greeting({ userName, hasAlerts, onBellPress }: { userName: string; hasAlerts: boolean; onBellPress: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Text variant="headlineMedium" color={colors.onBackground} header>
          {userName ? `¡Hola, ${userName}!` : '¡Hola!'}
        </Text>
      </View>
      <Pressable
        onPress={onBellPress}
        accessibilityRole="button"
        accessibilityLabel={hasAlerts ? 'Vencimientos, tenés facturas por vencer' : 'Vencimientos'}
        style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="notifications-none" />
        {hasAlerts && <Dot color={colors.error} style={{ position: 'absolute', top: 10, right: 10 }} />}
      </Pressable>
    </View>
  );
}

function BalanceHero({ state, currency }: { state: DashboardState; currency: keyof typeof Currencies }) {
  const symbol = Currencies[currency].symbol;
  const badge =
    state.vencidosCount > 0
      ? `${state.vencidosCount} vencidas`
      : state.totalIncome > 0
        ? `${Math.max(0, Math.trunc((state.pendingThisMonth * 100) / state.totalIncome))}% comprometido`
        : null;
  return (
    <HeroCard>
      {/* Si con texto grande no entran en un renglón, la etiqueta baja abajo del rótulo. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, columnGap: 8 }}>
        <Text variant="overline" color={Hero.onColorMuted} style={{ flexGrow: 1, flexShrink: 1, minWidth: '55%' }}>
          Te queda este mes
        </Text>
        {badge && <Tag text={badge} container={Hero.tile} contentColor={Hero.onColor} />}
      </View>
      <HeroAmount
        prefix={state.availableBalance < 0 ? `-${symbol}` : symbol}
        amount={formatAmount(state.availableBalance, currency)}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <HeroMetric icon="south-west" label="Ingresos" value={formatMoney(state.totalIncome, currency)} />
        <HeroMetric icon="north-east" label="Pendiente del mes" value={formatMoney(state.pendingThisMonth, currency)} />
      </View>
    </HeroCard>
  );
}

function HeroMetric({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <HeroTile style={{ flex: 1 }}>
      <View accessible accessibilityLabel={`${label}: ${spokenMoneyText(value) ?? value}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconBox icon={icon} container={Hero.tile} tint={Hero.onColor} size={32} />
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text variant="labelSmall" color={Hero.onColorMuted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {label}
          </Text>
          <Text variant="titleSmall" weight="bold" color={Hero.onColor} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {value}
          </Text>
        </View>
      </View>
    </HeroTile>
  );
}

function QuickAction({
  icon,
  title,
  onPress,
  highlighted,
}: {
  icon: string;
  title: string;
  onPress: () => void;
  highlighted?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} padding={12} style={{ flex: 1, alignItems: 'center' }}>
      <View>
        <IconBox icon={icon} container={highlighted ? colors.primaryContainer : colors.secondaryContainer} size={48} />
        {highlighted && <Dot color={colors.secondary} style={{ position: 'absolute', top: 2, right: 2 }} />}
      </View>
      <Text variant="titleSmall" style={{ marginTop: 10 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {title}
      </Text>
    </Card>
  );
}

function RecentActivity({ payments }: { payments: PaymentHistoryEntry[] }) {
  const { colors } = useTheme();
  return (
    <Card padding={0}>
      {payments.map((payment, index) => (
        <View key={payment.id}>
          {index > 0 && <Divider />}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
            <IconBox icon={CATEGORIES[payment.category].icon} size={40} />
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <Text variant="titleSmall" numberOfLines={2}>
                {payment.obligationName}
              </Text>
              <Text variant="bodySmall" color={colors.onSurfaceVariant} numberOfLines={1}>
                {`${CATEGORIES[payment.category].label.split(' (')[0]}, ${shortEs(payment.paidDate)}`}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text variant="titleSmall" weight="bold">
                -{formatMoney(payment.amount, payment.currency)}
              </Text>
              <Tag text="Pagado" />
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}

function PaidProgressCard({ percent }: { percent: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: colors.surfaceVariant, padding: 16 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="task-alt" size={22} color={colors.onPrimary} />
      </View>
      <View style={{ flex: 1, paddingHorizontal: 12 }}>
        <Text variant="titleSmall">Cuentas al día</Text>
        <Text variant="bodySmall" color={colors.onSurfaceVariant}>
          {percent}% de tus pagos de este mes ya están cubiertos
        </Text>
      </View>
      <Text variant="headlineSmall" weight="bold" color={colors.secondary}>
        {percent}%
      </Text>
    </View>
  );
}
