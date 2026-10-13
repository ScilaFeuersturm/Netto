import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, View } from 'react-native';

import { Currencies, type CurrencyCode } from '@/domain/currency';
import { numericEs, today } from '@/domain/dates';
import { parseAmount, sanitizeAmountInput, toAmountInput } from '@/domain/format';
import { CATEGORIES, CATEGORY_KEYS, type ObligationCategory } from '@/domain/models';
import { deleteObligation, getObligation, saveObligation } from '@/data/repository';
import { clearPendingScan, peekPendingScan } from '@/ocr/scanInvoice';
import { useAppData } from '@/state/AppDataProvider';
import { Chip, ChipRow, CurrencySelector, DateButton, SwitchRow, TextField } from '@/ui/form';
import { IconButton, PrimaryButton, Text } from '@/ui/primitives';
import { ScreenScroll } from '@/ui/Screen';
import { useTheme } from '@/ui/theme';

type FormState = {
  /** Vacío mientras es una factura nueva. */
  id: string;
  name: string;
  reference: string;
  amountText: string;
  currency: CurrencyCode;
  dueDate: number;
  category: ObligationCategory;
  isRecurring: boolean;
  notes: string;
  scannedImageUri: string | null;
  isEditing: boolean;
  /** Se conservan al editar para no "despagar" una factura ya pagada. */
  isPaid: boolean;
  paidDate: number | null;
};

export default function ObligationFormScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const obligationId = id ?? '';
  const { plan } = useAppData();

  const [form, setForm] = useState<FormState>(() => {
    // Una factura nueva arranca en la moneda de visualización del usuario.
    const base: FormState = {
      id: '',
      name: '',
      reference: '',
      amountText: '',
      currency: plan.displayCurrency,
      dueDate: today() + 7,
      category: 'SERVICIOS',
      isRecurring: true,
      notes: '',
      scannedImageUri: null,
      isEditing: false,
      isPaid: false,
      paidDate: null,
    };
    if (obligationId) return base;
    const scan = peekPendingScan();
    if (!scan) return base;
    const { result, imageUri } = scan;
    const missingBoth = result.suggestedAmount == null && result.suggestedDueDate == null;
    return {
      ...base,
      name: 'Factura escaneada',
      amountText: result.suggestedAmount != null ? sanitizeAmountInput(base.currency, String(result.suggestedAmount)) : '',
      dueDate: result.suggestedDueDate ?? base.dueDate,
      scannedImageUri: imageUri,
      notes: missingBoth
        ? 'No pudimos detectar el monto ni la fecha automáticamente. Texto leído: ' + result.rawText.slice(0, 300)
        : '',
    };
  });

  // El resultado del escaneo se usa una sola vez (al abrir el formulario).
  useEffect(() => clearPendingScan(), []);

  useEffect(() => {
    if (!obligationId) return;
    getObligation(obligationId).then((o) => {
      if (!o) return;
      setForm((f) => ({
        ...f,
        id: o.id,
        name: o.name,
        reference: o.reference ?? '',
        amountText: toAmountInput(o.amount, o.currency),
        currency: o.currency,
        dueDate: o.dueDate,
        category: o.category,
        isRecurring: o.isRecurring,
        notes: o.notes ?? '',
        isEditing: true,
        isPaid: o.isPaid,
        paidDate: o.paidDate,
      }));
    });
  }, [obligationId]);

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const amount = parseAmount(form.currency, form.amountText);
  const isValid = form.name.trim() !== '' && (amount ?? 0) > 0;

  const save = async () => {
    if (!isValid || amount == null) return;
    Keyboard.dismiss();
    await saveObligation({
      id: form.id,
      name: form.name.trim(),
      reference: form.reference.trim() || null,
      amount,
      currency: form.currency,
      dueDate: form.dueDate,
      category: form.category,
      isRecurring: form.isRecurring,
      notes: form.notes.trim() || null,
      isPaid: form.isPaid,
      paidDate: form.paidDate,
      createdFromOcr: form.scannedImageUri != null,
    });
    router.back();
  };

  const remove = async () => {
    if (!form.id) return;
    Keyboard.dismiss();
    await deleteObligation(form.id);
    router.back();
  };

  return (
    <ScreenScroll
      title={form.isEditing ? 'Editar pago' : 'Nuevo pago'}
      actions={form.isEditing ? <IconButton icon="delete" label="Eliminar" onPress={remove} color={colors.onBackground} /> : null}
      contentStyle={{ paddingHorizontal: 20 }}
    >
      {form.scannedImageUri && (
        <View style={{ gap: 8, marginTop: 8 }}>
          <Image
            source={{ uri: form.scannedImageUri }}
            contentFit="contain"
            style={{ width: '100%', height: 140 }}
            accessibilityLabel="Factura escaneada"
          />
          <Text variant="bodySmall" color={colors.onSurfaceVariant}>
            Completamos el monto y la fecha según lo que detectamos. Revisalos antes de guardar.
          </Text>
        </View>
      )}

      <TextField label="Nombre (ej. Luz, Internet, Colegio)" testID="obligation-name" value={form.name} onChangeText={(name) => update({ name })} />
      <TextField
        label="Referencia (Nº de cliente, cuenta o factura)"
        value={form.reference}
        onChangeText={(reference) => update({ reference })}
      />
      <TextField
        label="Monto"
        testID="obligation-amount"
        value={form.amountText}
        onChangeText={(v) => update({ amountText: sanitizeAmountInput(form.currency, v) })}
        prefix={Currencies[form.currency].symbol}
        keyboardType="decimal-pad"
      />
      <CurrencySelector
        selected={form.currency}
        onSelect={(currency) => update({ currency, amountText: sanitizeAmountInput(currency, form.amountText) })}
      />

      <DateButton label={`Vencimiento: ${numericEs(form.dueDate)}`} value={form.dueDate} onChange={(dueDate) => update({ dueDate })} />

      <View>
        <Text variant="labelLarge">Categoría</Text>
        <View style={{ marginTop: 8 }}>
          <ChipRow>
            {CATEGORY_KEYS.map((category) => (
              <Chip
                key={category}
                label={CATEGORIES[category].label}
                selected={form.category === category}
                onPress={() => update({ category })}
              />
            ))}
          </ChipRow>
        </View>
      </View>

      <SwitchRow label="Es un gasto recurrente mensual" value={form.isRecurring} onValueChange={(isRecurring) => update({ isRecurring })} />

      <TextField label="Notas (opcional)" value={form.notes} onChangeText={(notes) => update({ notes })} multiline />

      <PrimaryButton text="Guardar" onPress={save} disabled={!isValid} />
    </ScreenScroll>
  );
}
