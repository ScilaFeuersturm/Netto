import { View } from 'react-native';

import type { CurrencyConverter } from '@/domain/currency';
import { shortEs, today } from '@/domain/dates';
import { formatMoney } from '@/domain/format';
import { CATEGORIES, dueLabel, urgencyFraction, type Obligation, type ObligationStatus } from '@/domain/models';

import { Card, Icon, IconBox, PrimaryButton, ProgressBar, Tag, Text, TonalButton } from './primitives';
import { statusPalette, useTheme } from './theme';

/** Chip de vencimiento con el color del estado: "Vence en 2 días", "Vence mañana", "Pagada". */
export function StatusChip({ status, dueDate }: { status: ObligationStatus; dueDate: number }) {
  const { colors } = useTheme();
  const palette = statusPalette(status, colors);
  return <Tag text={dueLabel(dueDate, status, today())} container={palette.container} contentColor={palette.onContainer} />;
}

/**
 * Tarjeta de factura/vencimiento: ícono de categoría, nombre, monto, chip de vencimiento,
 * barra de urgencia y acción para marcarla como pagada.
 * Con `emphasized` el botón de pago es el principal (verde oscuro), como en el primer vencimiento del inicio.
 * Si se pasa `converter` y la factura está en otra moneda, se muestra también el equivalente en la moneda de visualización.
 */
export function ObligationCard({
  obligation,
  status,
  onPress,
  onMarkPaid,
  converter,
  emphasized,
}: {
  obligation: Obligation;
  status: ObligationStatus;
  onPress: () => void;
  onMarkPaid: () => void;
  converter?: CurrencyConverter;
  emphasized?: boolean;
}) {
  const { colors } = useTheme();
  const palette = statusPalette(status, colors);
  const isPaid = status === 'PAGADO';
  const category = CATEGORIES[obligation.category];
  const converted =
    converter && obligation.currency !== converter.target ? converter.convert(obligation.amount, obligation.currency) : null;

  return (
    // La tarjeta entera se puede tocar, pero para el lector de pantalla los datos y el botón de pago
    // son elementos separados (si no, "Pagar ahora" queda escondido dentro de la tarjeta).
    <Card onPress={onPress} accessible={false}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityHint="Abre el detalle del pago"
        onAccessibilityTap={onPress}
        style={{ flexDirection: 'row', alignItems: 'flex-start' }}
      >
        <IconBox icon={category.icon} />
        <View style={{ flex: 1, paddingHorizontal: 12, gap: 2 }}>
          <Text variant="titleMedium" numberOfLines={1}>
            {obligation.name}
          </Text>
          <Text variant="bodySmall" color={colors.onSurfaceVariant} numberOfLines={2}>
            {obligation.reference?.trim() ? `Ref: ${obligation.reference}` : category.label}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text variant="titleMedium" weight="bold">
            {formatMoney(obligation.amount, obligation.currency)}
          </Text>
          {converted != null && converter && (
            <Text variant="labelSmall" color={colors.onSurfaceVariant}>
              ≈ {formatMoney(converted, converter.target)}
            </Text>
          )}
          <StatusChip status={status} dueDate={obligation.dueDate} />
        </View>
      </View>

      <ProgressBar fraction={urgencyFraction(obligation.dueDate, isPaid, today())} color={palette.bar} style={{ marginTop: 14 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
        <Icon name={isPaid ? 'task-alt' : 'calendar-month'} size={16} color={colors.onSurfaceVariant} />
        <Text variant="labelMedium" color={colors.onSurfaceVariant} style={{ flex: 1, marginLeft: 6 }}>
          {isPaid
            ? `Pagada el ${shortEs(obligation.paidDate ?? obligation.dueDate)}`
            : `Vence el ${shortEs(obligation.dueDate)}${obligation.isRecurring ? ' • Mensual' : ''}`}
        </Text>
        {!isPaid &&
          (emphasized ? (
            <PrimaryButton text="Pagar ahora" icon="check-circle-outline" onPress={onMarkPaid} compact />
          ) : (
            <TonalButton text="Marcar pagada" icon="check" onPress={onMarkPaid} compact />
          ))}
      </View>
    </Card>
  );
}
