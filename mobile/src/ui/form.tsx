import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { CURRENCY_CODES, Currencies, type CurrencyCode } from '@/domain/currency';
import { fromLocalDate, toLocalDate, type EpochDay } from '@/domain/dates';

import { Icon, Text, TextButton } from './primitives';
import { Radius, textStyle, useTheme } from './theme';

/** Campo de texto con borde, etiqueta arriba, prefijo opcional y texto de ayuda/error abajo. */
export function TextField({
  label,
  value,
  onChangeText,
  prefix,
  error,
  supporting,
  keyboardType,
  secure,
  right,
  style,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  prefix?: string;
  error?: string | null;
  supporting?: string;
  keyboardType?: KeyboardTypeOptions;
  secure?: boolean;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'style'>) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.error : focused ? colors.primary : colors.outline;
  return (
    <View style={[{ gap: 4 }, style]}>
      <Text variant="labelMedium" color={error ? colors.error : colors.onSurfaceVariant}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: focused ? 2 : 1,
          borderColor,
          borderRadius: Radius.xs,
          paddingHorizontal: focused ? 13 : 14,
          minHeight: 52,
          backgroundColor: colors.surface,
        }}
      >
        {prefix && (
          <Text variant="bodyLarge" color={colors.onSurfaceVariant} style={{ marginRight: 4 }}>
            {prefix}
          </Text>
        )}
        <TextInput
          {...inputProps}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secure}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={colors.onSurfaceVariant}
          selectionColor={colors.primary}
          style={[textStyle('bodyLarge'), { flex: 1, color: colors.onSurface, paddingVertical: 12 }]}
        />
        {right}
      </View>
      {(error || supporting) && (
        <Text variant="bodySmall" color={error ? colors.error : colors.onSurfaceVariant}>
          {error ?? supporting}
        </Text>
      )}
    </View>
  );
}

export function PasswordField(props: Omit<React.ComponentProps<typeof TextField>, 'secure' | 'right'>) {
  const [visible, setVisible] = useState(false);
  const { colors } = useTheme();
  return (
    <TextField
      {...props}
      secure={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType={props.textContentType ?? 'password'}
      right={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          hitSlop={8}
        >
          <Icon name={visible ? 'visibility-off' : 'visibility'} size={22} color={colors.onSurfaceVariant} />
        </Pressable>
      }
    />
  );
}

/** Chip seleccionable (equivalente a FilterChip de Material). */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: Radius.xs,
        borderWidth: selected ? 0 : 1,
        borderColor: colors.outline,
        backgroundColor: selected ? colors.secondaryContainer : 'transparent',
        paddingHorizontal: selected ? 9 : 8,
        paddingVertical: selected ? 7 : 6,
      }}
    >
      {selected && <Icon name="check" size={16} color={colors.onSecondaryContainer} />}
      <Text variant="labelLarge" color={selected ? colors.onSecondaryContainer : colors.onSurfaceVariant}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Chips para elegir una de las monedas soportadas ("Gs. PYG", "$ ARS", "US$ USD"). */
export function CurrencySelector({
  selected,
  onSelect,
  style,
}: {
  selected: CurrencyCode;
  onSelect: (currency: CurrencyCode) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>
      {CURRENCY_CODES.map((code) => (
        <Chip
          key={code}
          label={`${Currencies[code].symbol} ${code}`}
          selected={code === selected}
          onPress={() => onSelect(code)}
        />
      ))}
    </View>
  );
}

/** Fila horizontal desplazable de chips. */
export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {children}
    </ScrollView>
  );
}

export function SwitchRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ flex: 1 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.surfaceVariant }}
        thumbColor={Platform.OS === 'android' ? (value ? colors.onPrimary : colors.outline) : undefined}
      />
    </View>
  );
}

/**
 * Botón que abre el selector de fecha nativo: diálogo en Android, calendario en un modal en iOS.
 */
export function DateButton({ label, value, onChange }: { label: string; value: EpochDay; onChange: (day: EpochDay) => void }) {
  const { colors, dark } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(() => toLocalDate(value));

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toLocalDate(value),
        mode: 'date',
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(fromLocalDate(date));
        },
      });
    } else {
      setDraft(toLocalDate(value));
      setIosOpen(true);
    }
  };

  return (
    <>
      <Pressable
        onPress={open}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderWidth: 1,
          borderColor: colors.outline,
          borderRadius: Radius.sm,
          minHeight: 48,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Icon name="calendar-today" size={18} color={colors.primary} />
        <Text variant="labelLarge" color={colors.primary}>
          {label}
        </Text>
      </Pressable>
      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="fade" onRequestClose={() => setIosOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: Radius.xl, padding: 16 }}>
              <DateTimePicker
                value={draft}
                mode="date"
                display="inline"
                locale="es"
                themeVariant={dark ? 'dark' : 'light'}
                accentColor={colors.primary}
                onChange={(_, date) => date && setDraft(date)}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16 }}>
                <TextButton text="Cancelar" onPress={() => setIosOpen(false)} />
                <TextButton
                  text="Aceptar"
                  onPress={() => {
                    onChange(fromLocalDate(draft));
                    setIosOpen(false);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

/** Diálogo simple con contenido libre y acciones (equivalente a AlertDialog de Compose). */
export function Dialog({
  visible,
  title,
  children,
  onDismiss,
  confirmText,
  onConfirm,
  cancelText = 'Cancelar',
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onDismiss: () => void;
  confirmText: string;
  onConfirm: () => void;
  cancelText?: string;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: Radius.xl, padding: 24, gap: 12 }}>
          <Text variant="headlineSmall">{title}</Text>
          {children}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16 }}>
            <TextButton text={cancelText} onPress={onDismiss} />
            <TextButton text={confirmText} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
