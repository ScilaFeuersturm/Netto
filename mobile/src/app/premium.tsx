import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { usePremium } from '@/data/premium';
import { fromLocalDate, numericEs } from '@/domain/dates';
import { LegalLinks } from '@/domain/legal';
import { ConsumerRightsButtons } from '@/features/ConsumerRights';
import { PREMIUM_BENEFITS } from '@/features/Premium';
import { HOUSEHOLD_MAX_MEMBERS } from '@/data/household';
import { Chip } from '@/ui/form';
import { AlertBanner, Card, Icon, IconBox, PrimaryButton, Tag, Text, TextButton } from '@/ui/primitives';
import { ScreenScroll } from '@/ui/Screen';
import { Radius, useTheme } from '@/ui/theme';

/**
 * Planes de Inariko Premium. Precios base en USD; cuando esté RevenueCat, cada tienda los muestra en la
 * moneda del país y la compra se hace desde acá.
 */
const PLANS = {
  individual: [
    { id: 'annual', title: 'Anual', price: '19,99 USD por año', detail: 'Equivale a 1,67 USD por mes', badge: 'Ahorrás 44%' },
    { id: 'monthly', title: 'Mensual', price: '2,99 USD por mes', detail: 'Cancelás cuando quieras', badge: null },
  ],
  family: [
    {
      id: 'family-annual',
      title: 'Familiar anual',
      price: '34,99 USD por año',
      detail: `Hasta ${HOUSEHOLD_MAX_MEMBERS} personas. Equivale a 2,92 USD por mes`,
      badge: 'Ahorrás 41%',
    },
    {
      id: 'family-monthly',
      title: 'Familiar mensual',
      price: '4,99 USD por mes',
      detail: `Hasta ${HOUSEHOLD_MAX_MEMBERS} personas. Cancelás cuando quieras`,
      badge: null,
    },
  ],
} as const;

type Kind = keyof typeof PLANS;
type PlanId = (typeof PLANS)[Kind][number]['id'];

export default function PremiumPaywallScreen() {
  const { colors } = useTheme();
  const { premium, until, plan: currentPlan } = usePremium();
  const [kind, setKind] = useState<Kind>('individual');
  const [selected, setSelected] = useState<PlanId>('annual');
  const plans = PLANS[kind];

  const chooseKind = (next: Kind) => {
    setKind(next);
    setSelected(PLANS[next][0].id);
  };

  return (
    <ScreenScroll title="Inariko Premium">
      {premium && until != null ? (
        <AlertBanner
          icon="workspace-premium"
          message={`Tenés Premium${currentPlan === 'family' ? ' familiar' : ''} hasta el ${numericEs(fromLocalDate(new Date(until)))}. ¡Gracias por apoyar Inariko!`}
        />
      ) : (
        <Text variant="bodyLarge" color={colors.onSurfaceVariant}>
          Lo de siempre gratis, más todo esto para tener tus cuentas bajo control:
        </Text>
      )}

      <Card style={{ gap: 14 }}>
        {PREMIUM_BENEFITS.map((benefit) => (
          <View key={benefit.title} accessible style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconBox icon={benefit.icon} container={colors.primaryContainer} tint={colors.brand} size={40} />
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
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label="Para mí" selected={kind === 'individual'} onPress={() => chooseKind('individual')} />
            <Chip
              label={`Familiar (hasta ${HOUSEHOLD_MAX_MEMBERS})`}
              selected={kind === 'family'}
              onPress={() => chooseKind('family')}
            />
          </View>
          {kind === 'family' && (
            <Text variant="bodySmall" color={colors.onSurfaceVariant}>
              {`Pagás vos y hasta ${HOUSEHOLD_MAX_MEMBERS - 1} personas más tienen Premium. Comparten las facturas, ingresos y pagos que marquen como "de la casa"; lo demás sigue siendo privado de cada uno.`}
            </Text>
          )}

          <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
            {plans.map((plan) => {
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
      <ConsumerRightsButtons />
    </ScreenScroll>
  );
}
