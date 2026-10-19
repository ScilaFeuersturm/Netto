import { router, Tabs } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePremium } from '@/data/premium';
import { setDisplayCurrency } from '@/data/repository';
import { CURRENCY_CODES, Currencies, type CurrencyCode } from '@/domain/currency';
import { NotificationPrimer } from '@/features/NotificationPrimer';
import { goToPremium } from '@/features/Premium';
import { headerState, type HeaderState } from '@/features/selectors';
import { useDerived } from '@/state/AppDataProvider';
import { AlertBanner, Divider, Icon, Text } from '@/ui/primitives';
import { Radius, useTheme } from '@/ui/theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: { name: string; label: string; icon: string }[] = [
  { name: 'index', label: 'Inicio', icon: 'grid-view' },
  { name: 'obligations', label: 'Facturas', icon: 'receipt-long' },
  { name: 'budget', label: 'Ahorro', icon: 'auto-awesome' },
  { name: 'history', label: 'Reportes', icon: 'assessment' },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <>
    <NotificationPrimer />
    <Tabs
      tabBar={(props) => <NettoBottomBar {...props} />}
      screenOptions={{
        header: () => <NettoTopBar />,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
    </>
  );
}

function NettoTopBar() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const header = useDerived(headerState);
  const openProfile = () => router.push('/profile');

  return (
    <View style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 }}>
        {/* Las barras superior e inferior están siempre en pantalla: crecen poco con el texto grande,
            como las barras del sistema, para dejarle lugar al contenido. */}
        <Text variant="titleLarge" color={colors.onBackground} style={{ flex: 1 }} maxFontSizeMultiplier={1.3} header>
          Netto
        </Text>
        <CurrencyMenu selected={header.displayCurrency} onSelect={(c) => void setDisplayCurrency(c)} />
        <Pressable
          onPress={openProfile}
          accessibilityRole="button"
          accessibilityLabel="Perfil"
          style={{
            marginLeft: 10,
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {header.initials ? (
            <Text variant="labelLarge" color={colors.onPrimaryContainer} maxFontSizeMultiplier={1}>
              {header.initials}
            </Text>
          ) : (
            <Icon name="person-outline" size={22} color={colors.onPrimaryContainer} />
          )}
        </Pressable>
      </View>
      <MissingRatesBanner header={header} onPress={openProfile} />
    </View>
  );
}

function MissingRatesBanner({ header, onPress }: { header: HeaderState; onPress: () => void }) {
  if (header.missingRates.length === 0) return null;
  return (
    <AlertBanner
      critical
      onPress={onPress}
      style={{ marginHorizontal: 16, marginVertical: 8 }}
      message={
        `Falta la cotización de ${header.missingRates.join(', ')}, así que algunos montos ` +
        'no se suman a los totales. Conectate a internet o cargala a mano desde tu perfil.'
      }
    />
  );
}

/** Selector rápido de la moneda en la que se muestran los totales. */
function CurrencyMenu({ selected, onSelect }: { selected: CurrencyCode; onSelect: (c: CurrencyCode) => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { premium } = usePremium();
  return (
    <>
      <Pressable
        // Sin Premium hay una sola moneda: el botón la muestra y lleva a los planes.
        onPress={() => (premium ? setOpen(true) : goToPremium())}
        accessibilityRole="button"
        accessibilityLabel={
          premium
            ? `Moneda: ${Currencies[selected].label}. Cambiar moneda`
            : `Moneda: ${Currencies[selected].label}. Otras monedas con Premium`
        }
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: Radius.pill,
          backgroundColor: colors.surfaceVariant,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Icon name="currency-exchange" size={16} />
        <Text variant="labelLarge" style={{ marginHorizontal: 6 }} maxFontSizeMultiplier={1.3}>
          {selected}
        </Text>
        <Icon name={premium ? 'keyboard-arrow-down' : 'lock-outline'} size={16} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View
            style={{
              position: 'absolute',
              top: insets.top + 56,
              right: 56,
              minWidth: 220,
              backgroundColor: colors.surface,
              borderRadius: Radius.sm,
              paddingVertical: 8,
              elevation: 6,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            {CURRENCY_CODES.map((code) => (
              <Pressable
                key={code}
                accessibilityRole="button"
                accessibilityState={{ selected: code === selected }}
                onPress={() => {
                  setOpen(false);
                  onSelect(code);
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
                })}
              >
                <Text variant="bodyLarge" style={{ flex: 1 }}>
                  {`${Currencies[code].symbol}  ${Currencies[code].label}`}
                </Text>
                {code === selected && <Icon name="check" size={18} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function NettoBottomBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Divider />
      <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8 + insets.bottom }}>
        {state.routes.map((route, index) => {
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;
          const selected = state.index === index;
          const color = selected ? colors.onBackground : colors.onSurfaceVariant;
          return (
            <Pressable
              key={route.key}
              testID={`tab-${tab.name}`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!selected && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: 'center',
                gap: 4,
                paddingVertical: 6,
                borderRadius: Radius.sm,
                backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
              })}
            >
              <Icon name={tab.icon} size={24} color={color} />
              <Text variant="labelMedium" weight={selected ? 'bold' : 'medium'} color={color} maxFontSizeMultiplier={1.2} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
