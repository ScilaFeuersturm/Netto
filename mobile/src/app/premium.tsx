import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { usePremium } from '@/data/premium';
import { fromLocalDate, numericEs } from '@/domain/dates';
import { LegalLinks } from '@/domain/legal';
import { PREMIUM_BENEFITS } from '@/features/Premium';
import { AlertBanner, Card, Icon, IconBox, PrimaryButton, Tag, Text, TextButton } from '@/ui/primitives';
import { ScreenScroll } from '@/ui/Screen';
import { Radius, useTheme } from '@/ui/theme';

/**
 * Planes de Netto Premium. Precios base en USD; cuando esté RevenueCat, cada tienda los muestra en la
 * moneda del país y la compra se hace desde acá.
 */
const PLANS = [
  { id: 'annual', title: 'Anual', price: '19,99 USD por año', detail: 'Equivale a 1,67 USD por mes', badge: 'Ahorrás 44%' },
  { id: 'monthly', title: 'Mensual', price: '2,99 USD por mes', detail: 'Cancelás cuando quieras', badge: null },
] as const;

type PlanId = (typeof PLANS)[number]['id'];

export default function PremiumPaywallScreen() {
  const { colors } = useTheme();
  const { premium, until } = usePremium();
  const [selected, setSelected] = useState<PlanId>('annual');

  return (
    <ScreenScroll title="Netto Premium">
      {premium && until != null ? (
        <AlertBanner
          icon="workspace-premium"
          message={`Tenés Premium hasta el ${numericEs(fromLocalDate(new Date(until)))}. ¡Gracias por apoyar Netto!`}
        />
      ) : (
        <Text variant="bodyLarge" color={colors.onSurfaceVariant}>
          Lo de siempre gratis, más todo esto para tener tus cuentas bajo control:
        </Text>
      )}

      <Card style={{ gap: 14 }}>
        {PREMIUM_BENEFITS.map((benefit) => (
          <View key={benefit.title} accessible style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconBox icon={benefit.icon} container={colors.primaryContainer} tint={colors.onPrimaryContainer} size={40} />
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall">{benefit.title}</Text>
              <Text variant="bodySmall" color={colors.onSurfaceVariant}>
                {benefit.text}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {!premium && (
        <>
          <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
            {PLANS.map((plan) => {
              const isSelected = plan.id === selected;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelected(plan.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`${plan.title}, ${plan.price}. ${plan.detail}${plan.badge ? `. ${plan.badge}` : ''}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 16,
                    borderRadius: Radius.md,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? colors.primary : colors.outline,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Icon
                    name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    color={isSelected ? colors.primary : colors.onSurfaceVariant}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <Text variant="titleMedium">{plan.title}</Text>
                      {plan.badge && (
                        <Tag text={plan.badge} container={colors.tertiaryContainer} contentColor={colors.onTertiaryContainer} />
                      )}
                    </View>
                    <Text variant="amount">{plan.price}</Text>
                    <Text variant="bodySmall" color={colors.onSurfaceVariant}>
                      {plan.detail}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* La compra llega con RevenueCat (paso 20 del plan); hasta entonces el botón no hace nada. */}
          <PrimaryButton text="Probar 7 días gratis" onPress={() => {}} disabled />
          <AlertBanner message="Las compras se activan en la próxima versión de prueba." />

          <Text variant="bodySmall" color={colors.onSurfaceVariant}>
            Los primeros 7 días son gratis. Después se cobra el plan elegido por la App Store o Google Play, y se renueva
            solo al final de cada período salvo que lo canceles al menos 24 horas antes desde la configuración de tu
            cuenta de la tienda. Borrar la app no cancela la suscripción.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 16 }}>
            <TextButton text="Restaurar compras" onPress={() => {}} />
            <TextButton text="Términos" onPress={() => void Linking.openURL(LegalLinks.terms)} />
            <TextButton text="Privacidad" onPress={() => void Linking.openURL(LegalLinks.privacy)} />
          </View>
        </>
      )}
    </ScreenScroll>
  );
}
