import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  Text as RNText,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextProps as RNTextProps,
  type ViewStyle,
} from 'react-native';

import { spokenMoneyText } from '@/domain/format';

import { Hero, maxFontScale, Radius, textStyle, useTheme, type FontWeight, type TypographyVariant } from './theme';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export function Icon({ name, size = 24, color }: { name: IconName | string; size?: number; color?: string }) {
  const { colors } = useTheme();
  // Los íconos son decorativos: el lector de pantalla no debe leer su glifo.
  return (
    <MaterialIcons
      name={name as IconName}
      size={size}
      color={color ?? colors.onSurface}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  weight?: FontWeight;
  color?: string;
  /** Título de pantalla o sección: el lector de pantalla permite saltar de título en título. */
  header?: boolean;
};

export function Text({ variant = 'bodyMedium', weight, color, style, header, ...props }: TextProps) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  // React Native agranda lineHeight con el texto del sistema sin respetar maxFontSizeMultiplier,
  // y quedan renglones altísimos. Con el texto agrandado se usa el interlineado propio de la fuente.
  const scaled = fontScale > 1 ? { lineHeight: undefined } : null;
  // Los montos se leen con el nombre de la moneda ("350.000 guaraníes" en vez de "G S 350.000").
  const spoken =
    props.accessibilityLabel == null && typeof props.children === 'string' ? spokenMoneyText(props.children) : null;
  return (
    <RNText
      accessibilityRole={header ? 'header' : undefined}
      accessibilityLabel={spoken ?? undefined}
      maxFontSizeMultiplier={maxFontScale(variant)}
      {...props}
      style={[textStyle(variant, weight), { color: color ?? colors.onSurface }, style, scaled]}
    />
  );
}

export const ScreenPadding = 16;

/** Tarjeta base de todas las secciones. */
export function Card({
  children,
  onPress,
  padding = 16,
  style,
  accessible,
}: {
  children: ReactNode;
  onPress?: () => void;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  /** false si la tarjeta tiene botones adentro: así el lector de pantalla los ve por separado. */
  accessible?: boolean;
}) {
  const { colors } = useTheme();
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding,
    overflow: 'hidden',
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      accessible={accessible}
      accessibilityRole={accessible === false ? undefined : 'button'}
      onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}>
      {children}
    </Pressable>
  );
}

/** Talón: bloque de tinta azul para el dato principal de cada pantalla. */
export function HeroCard({ children }: { children: ReactNode }) {
  const { dark } = useTheme();
  return (
    <View style={{ backgroundColor: dark ? Hero.fillDark : Hero.fill, borderRadius: Radius.lg, padding: 20, gap: 14 }}>
      {children}
    </View>
  );
}

/** Dato secundario del talón, debajo del troquel (línea punteada). */
export function HeroTile({
  children,
  style,
  ...a11y
}: { children: ReactNode; style?: StyleProp<ViewStyle>; accessible?: boolean; accessibilityLabel?: string }) {
  return (
    <View
      {...a11y}
      style={[
        { borderTopWidth: 1, borderStyle: 'dashed', borderColor: Hero.perforation, paddingTop: 12, gap: 2 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Monto grande del talón: símbolo chico a la izquierda y número grande. */
export function HeroAmount({ prefix, amount }: { prefix: string; amount: string }) {
  return (
    <View
      accessible
      accessibilityLabel={spokenMoneyText(`${prefix} ${amount}`) ?? `${prefix} ${amount}`}
      style={{ flexDirection: 'row', alignItems: 'flex-end' }}
    >
      <Text variant="titleMedium" color={Hero.onColorMuted} style={{ marginRight: 6, marginBottom: 9 }}>
        {prefix}
      </Text>
      <Text variant="amountDisplay" color={Hero.onColor} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1 }}>
        {amount}
      </Text>
    </View>
  );
}

/**
 * Sello de goma, como el "PAGADO" que ponen en la caja: borde doble, levemente torcido.
 * Es el único adorno de la app; se usa solo para lo que ya se pagó.
 */
export function Stamp({ text, detail, color }: { text: string; detail?: string; color: string }) {
  return (
    <View
      accessible
      accessibilityLabel={detail ? `${text} el ${detail}` : text}
      style={{
        transform: [{ rotate: '-6deg' }],
        borderWidth: 2,
        borderColor: color,
        borderRadius: Radius.sm,
        padding: 2,
      }}
    >
      <View style={{ borderWidth: 1, borderColor: color, borderRadius: Radius.xs, paddingHorizontal: 10, paddingVertical: 2, alignItems: 'center' }}>
        <Text variant="titleSmall" weight="extrabold" color={color} style={{ letterSpacing: 0.5 }}>
          {text}
        </Text>
        {detail && (
          <Text variant="labelSmall" color={color}>
            {detail}
          </Text>
        )}
      </View>
    </View>
  );
}

/** Ícono dentro de un cuadrado redondeado (íconos de categoría, acciones rápidas). */
export function IconBox({
  icon,
  container,
  tint,
  size = 44,
}: {
  icon: string;
  container?: string;
  tint?: string;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Radius.sm,
        backgroundColor: container ?? colors.secondaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={size * 0.5} color={tint ?? colors.onSecondaryContainer} />
    </View>
  );
}

/** Etiqueta chica con fondo de color ("Vence en 2 días", "Activo", "3 opciones"). */
export function Tag({
  text,
  container,
  contentColor,
  style,
}: {
  text: string;
  container?: string;
  contentColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[{ borderRadius: Radius.xs, backgroundColor: container ?? colors.primaryContainer, paddingHorizontal: 7, paddingVertical: 2 }, style]}>
      <Text variant="labelMedium" color={contentColor ?? colors.onPrimaryContainer}>
        {text}
      </Text>
    </View>
  );
}

/** Título de sección con contador opcional y link a la derecha. */
export function SectionHeader({
  title,
  count,
  actionText,
  onAction,
}: {
  title: string;
  count?: number;
  actionText?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 4 }}>
      <Text variant="titleLarge" color={colors.onBackground} header style={{ flexShrink: 1 }}>
        {title}
      </Text>
      {count != null && count > 0 && (
        <Tag
          text={String(count)}
          container={colors.tertiaryContainer}
          contentColor={colors.onTertiaryContainer}
          style={{ marginLeft: 8 }}
        />
      )}
      <View style={{ flex: 1 }} />
      {actionText && (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={12} style={{ padding: 4 }}>
          <Text variant="labelLarge" color={colors.primary}>
            {actionText}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** Barra de progreso plana y redondeada. */
export function ProgressBar({
  fraction,
  color,
  trackColor,
  height = 6,
  style,
  label,
}: {
  fraction: number;
  color: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
  /** Qué mide la barra. Sin `label` es decorativa (el dato ya está escrito al lado) y se oculta al lector. */
  label?: string;
}) {
  const { colors } = useTheme();
  const clamped = Math.min(1, Math.max(0, fraction));
  const a11y = label
    ? {
        accessible: true,
        accessibilityRole: 'progressbar' as const,
        accessibilityLabel: label,
        accessibilityValue: { min: 0, max: 100, now: Math.round(clamped * 100) },
      }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <View
      {...a11y}
      style={[{ height, borderRadius: height, backgroundColor: trackColor ?? colors.surfaceVariant, overflow: 'hidden' }, style]}>
      <View style={{ width: `${clamped * 100}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

/** Punto de color usado en leyendas. */
export function Dot({ color, size = 8, style }: { color: string; size?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

type ButtonProps = {
  text: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Para el lector de pantalla, cuando el texto visible no alcanza ("Marcar pagada" ¿cuál?). */
  accessibilityLabel?: string;
};

function BaseButton({
  text,
  onPress,
  icon,
  disabled,
  loading,
  compact,
  style,
  container,
  content,
  border,
  accessibilityLabel,
}: ButtonProps & { container: string; content: string; border?: string }) {
  const { colors } = useTheme();
  const inactive = disabled || loading;
  const fg = inactive && !border ? colors.onSurfaceVariant : content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: Radius.sm,
          paddingHorizontal: compact ? 14 : 16,
          paddingVertical: compact ? 8 : 12,
          minHeight: compact ? 36 : 48,
          backgroundColor: inactive && !border ? colors.surfaceVariant : container,
          borderWidth: border ? 1 : 0,
          borderColor: border,
          opacity: pressed ? 0.85 : inactive && border ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text variant="labelLarge" color={fg}>
        {text}
      </Text>
    </Pressable>
  );
}

/** Botón principal en tinta azul. */
export function PrimaryButton(props: ButtonProps) {
  const { colors } = useTheme();
  return <BaseButton {...props} container={colors.primary} content={colors.onPrimary} />;
}

/** Botón secundario con fondo suave. */
export function TonalButton(props: ButtonProps & { container?: string; contentColor?: string }) {
  const { colors } = useTheme();
  return (
    <BaseButton
      {...props}
      container={props.container ?? colors.primaryContainer}
      content={props.contentColor ?? colors.onPrimaryContainer}
    />
  );
}

export function OutlinedButton(props: ButtonProps) {
  const { colors } = useTheme();
  return <BaseButton {...props} container="transparent" content={colors.primary} border={colors.outline} />;
}

export function TextButton({ text, onPress }: { text: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 10, minHeight: 44 }}
      hitSlop={4}
    >
      <Text variant="labelLarge" color={colors.primary}>
        {text}
      </Text>
    </Pressable>
  );
}

/** Aviso en línea. Por defecto es neutro; con `critical` usa los colores de error. */
export function AlertBanner({
  message,
  critical,
  icon = 'notification-important',
  onPress,
  style,
}: {
  message: string;
  critical?: boolean;
  icon?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const container = critical ? colors.errorContainer : colors.surfaceVariant;
  const content = critical ? colors.onErrorContainer : colors.onSurface;
  const iconTint = critical ? colors.error : colors.onSurface;
  // Los errores aparecen después de tocar un botón: se anuncian para que no pasen desapercibidos.
  useEffect(() => {
    if (critical) AccessibilityInfo.announceForAccessibility(message);
  }, [critical, message]);
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLiveRegion={critical ? 'assertive' : 'polite'}
      style={[{ flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, backgroundColor: container, paddingHorizontal: 14, paddingVertical: 12 }, style]}
    >
      <Icon name={icon} size={20} color={iconTint} />
      <Text color={content} style={{ marginLeft: 10, flex: 1 }}>
        {message}
      </Text>
    </Pressable>
  );
}

/** Ícono tocable (acciones de barra, eliminar, etc). */
export function IconButton({
  icon,
  onPress,
  color,
  label,
}: {
  icon: string;
  onPress: () => void;
  color?: string;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({ padding: 8, borderRadius: 20, opacity: pressed ? 0.6 : 1 })}
    >
      <Icon name={icon} size={24} color={color} />
    </Pressable>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.outlineVariant }} />;
}
