import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { scanInvoice, setPendingScan } from '@/ocr/scanInvoice';
import { Icon, OutlinedButton, PrimaryButton, Text } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/Screen';
import { useTheme } from '@/ui/theme';

const READ_ERROR = 'No pudimos leer la factura automáticamente. Probá con más luz o cargá los datos a mano.';

export default function ScanInvoiceScreen() {
  const { colors } = useTheme();
  const [isProcessing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const process = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setProcessing(true);
    setError(null);
    try {
      setPendingScan(await scanInvoice({ uri: asset.uri, width: asset.width, height: asset.height }));
      router.replace('/obligation');
    } catch {
      setProcessing(false);
      setError(READ_ERROR);
    }
  };

  // Foto en resolución completa: una miniatura no alcanza para que el OCR lea el texto.
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Necesitamos permiso para usar la cámara. Podés habilitarlo desde los ajustes del teléfono.');
      return;
    }
    await process(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 }));
  };

  const pickFromGallery = async () => {
    await process(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Escanear factura" />
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        {isProcessing ? (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text color={colors.onSurfaceVariant} style={{ marginTop: 16 }}>
              Leyendo tu factura…
            </Text>
          </>
        ) : (
          <>
            <View style={{ marginBottom: 8 }}>
              <Icon name="camera-alt" color={colors.primary} />
            </View>
            <Text color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
              {'Sacale una foto a tu factura o elegí una de tu galería.\nDetectamos el monto y la fecha de vencimiento automáticamente.'}
            </Text>
            {error && (
              <Text variant="bodySmall" color={colors.error} style={{ marginTop: 12, textAlign: 'center' }}>
                {error}
              </Text>
            )}
            <View style={{ alignSelf: 'stretch', gap: 12, marginTop: 24 }}>
              <PrimaryButton text="Tomar foto" icon="camera-alt" onPress={takePhoto} />
              <OutlinedButton text="Elegir de la galería" icon="photo-library" onPress={pickFromGallery} />
              <OutlinedButton text="Cargar los datos manualmente" icon="edit" onPress={() => router.replace('/obligation')} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}
