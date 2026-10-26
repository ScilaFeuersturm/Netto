import { useWindowDimensions, View } from 'react-native';

import type { CurrencyConverter } from '@/domain/currency';
import { shortEs, today } from '@/domain/dates';
import { formatMoney, spokenMoneyText } from '@/domain/format';
import { CATEGORIES, dueLabel, urgencyFraction, type Obligation, type ObligationStatus } from '@/domain/models';

import { Card, Icon, IconBox, PrimaryButton, ProgressBar, Stamp, Tag, Text, TonalButton } from './primitives';
import { SharedTag } from '@/features/Household';

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
 * Las pagadas llevan el sello de "Pagada" en lugar del botón.
 * Con `emphasized` el botón de pago es el principal (tinta azul), como en el primer vencimiento del inicio.
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
  // Con texto muy grande no entran dos columnas: el monto y el vencimiento pasan abajo del nombre.
  const stacked = useWindowDimensions().fontScale >= 1.3;
  const palette = statusPalette(status, colors);
  const isPaid = status === 'PAGADO';
  const category = CATEGORIES[obligation.category];
  const converted =
    converter && obligation.currency !== converter.target ? converter.convert(obligation.amount, obligation.currency) : null;
  const amountText = formatMoney(obligation.amount, obligation.currency);
  const detailText = obligation.reference?.trim() ? `Ref: ${obligation.reference}` : category.label;
  // Lo que lee el lector de pantalla al llegar a la tarjeta, en el orden en que importa.
  const spokenLabel = [
    obligation.name,
    detailText,
    obligation.householdId ? 'De la casa' : null,
    spokenMoneyText(amountText) ?? amountText,
    converted != null && converter ? `aproximadamente ${spokenMoneyText(formatMoney(converted, converter.target))}` : null,
    isPaid ? null : dueLabel(obligation.dueDate, status, today()),
  ]
    .filter(Boolean)
    .join('. ');

  return (
    // La tarjeta entera se puede tocar, pero para el lector de pantalla los datos y el botón de pago
    // son elementos separados (si no, "Pagar ahora" queda escondido dentro de la tarjeta).
    <Card onPress={onPress} accessible={false}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={spokenLabel}
        accessibilityHint="Abre el detalle del pago"
        onAccessibilityTap={onPress}
        style={{ flexDirection: 'row', alignItems: 'flex-start', flexWrap: stacked ? 'wrap' : 'nowrap' }}
      >
        <IconBox icon={category.icon} />
        <View style={{ flex: 1, paddingHorizontal: 12, gap: 2 }}>
          <Text variant="titleMedium" numberOfLines={2}>
            {obligation.name}
          </Text>
          <Text variant="bodySmall" color={colors.onSurfaceVariant} numberOfLines={2}>
            {detailText}
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            <SharedTag ownerId={obligation.userId} householdId={obligation.householdId} />
          </View>
        </View>
        <View style={stacked ? { width: '100%', alignItems: 'flex-start', gap: 6, marginTop: 10 } : { alignItems: 'flex-end', gap: 6 }}>
          <Text variant="amount">
            {amountText}
          </Text>
          {converted != null && converter && (
            <Text variant="labelSmall" color={colors.onSurfaceVariant}>
              ≈ {formatMoney(converted, converter.target)}
            </Text>
          )}
          {!isPaid && <StatusChip status={status} dueDate={obligation.dueDate} />}
        </View>
      </View>

      {!isPaid && (
        <ProgressBar fraction={urgencyFraction(obligation.dueDate, isPaid, today())} color={palette.bar} style={{ marginTop: 14 }} />
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 8, columnGap: 6, marginTop: 12, minHeight: 36 }}>
        {isPaid ? (
          <>
            <Text variant="labelMedium" color={colors.onSurfaceVariant} style={{ flexGrow: 1, flexShrink: 1, minWidth: '50%' }}>
              {obligation.isRecurring ? 'Se repite cada mes' : 'Pago único'}
            </Text>
            <Stamp text="Pagada" detail={shortEs(obligation.paidDate ?? obligation.dueDate)} color={palette.bar} />
          </>
        ) : (
          <>
            <Icon name="calendar-month" size={16} color={colors.onSurfaceVariant} />
            <Text variant="labelMedium" color={colors.onSurfaceVariant} style={{ flexGrow: 1, flexShrink: 1, minWidth: '50%' }}>
              {`Vence el ${shortEs(obligation.dueDate)}${obligation.isRecurring ? ', cada mes' : ''}`}
            </Text>
            {emphasized ? (
              <PrimaryButton
                text="Pagar ahora"
                icon="check-circle-outline"
                onPress={onMarkPaid}
                compact
                accessibilityLabel={`Marcar ${obligation.name} como pagada`}
              />
            ) : (
              <TonalButton
                text="Marcar pagada"
                icon="check"
                onPress={onMarkPaid}
                compact
                accessibilityLabel={`Marcar ${obligation.name} como pagada`}
              />
            )}
          </>
        )}
      </View>
    </Card>
  );
}
