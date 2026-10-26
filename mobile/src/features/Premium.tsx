import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { usePremium } from '@/data/premium';
import { Card, Icon, IconBox, PrimaryButton, ScreenPadding, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/** Lo que suma Premium, en el orden en que se muestra en la pantalla de planes. */
export const PREMIUM_BENEFITS = [
  { icon: 'document-scanner', title: 'Escanear facturas', text: 'Sacale una foto y Inariko carga el monto y el vencimiento.' },
  { icon: 'notifications-active', title: 'Avisos de vencimiento', text: 'Te avisamos antes de que venza cada factura.' },
  { icon: 'savings', title: 'Modelos de ahorro', text: 'Repartí tu ingreso con 50/30/20, 70/20/10 u otro a tu medida.' },
  { icon: 'insights', title: 'Reportes', text: 'Cuánto entró, cuánto pagaste y en qué, mes a mes.' },
  { icon: 'currency-exchange', title: 'Varias monedas', text: 'Pesos, guaraníes y dólares, con la cotización que elijas.' },
  { icon: 'group', title: 'Plan familiar', text: 'Compartí las cuentas de la casa con hasta 2 personas más.' },
  { icon: 'support-agent', title: 'Atención prioritaria', text: 'Tus consultas se responden primero.' },
] as const;

export function goToPremium(): void {
  router.push('/premium');
}

/**
 * Lo que ve quien está en el plan gratis en lugar de una función Premium: qué hace y cómo activarla.
 * Explica la función en vez de solo decir "bloqueado", para que se entienda qué se gana.
 */
export function PremiumLocked({ icon, title, description }: { icon: string; title: string; description: string }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconBox icon={icon} container={colors.primaryContainer} tint={colors.brand} />
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" header>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="lock-outline" size={14} color={colors.onSurfaceVariant} />
            <Text variant="labelMedium" color={colors.onSurfaceVariant}>
              Incluido en Premium
            </Text>
          </View>
        </View>
      </View>
      <Text color={colors.onSurfaceVariant}>{description}</Text>
      <PrimaryButton text="Ver Premium" icon="workspace-premium" onPress={goToPremium} />
    </Card>
  );
}

/** Pantalla entera para una pestaña Premium: muestra el contenido o, en el plan gratis, la explicación. */
export function PremiumScreen({
  children,
  icon,
  title,
  description,
}: {
  children: ReactNode;
  icon: string;
  title: string;
  description: string;
}) {
  const { premium } = usePremium();
  if (premium) return <>{children}</>;
  return (
    <ScrollView contentContainerStyle={{ padding: ScreenPadding, gap: 16 }}>
      <PremiumLocked icon={icon} title={title} description={description} />
    </ScrollView>
  );
}
