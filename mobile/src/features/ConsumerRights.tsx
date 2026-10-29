import { Linking, View } from 'react-native';

import { LegalLinks } from '@/domain/legal';
import { TextButton } from '@/ui/primitives';

/**
 * Los botones de arrepentimiento y de baja que exige la Disposición 954/2025 (Argentina): con ese
 * texto exacto, a la vista y sin pedir registrarse. Por eso también están en el inicio de sesión.
 * Abren la página web, que sirve sin cuenta y explica también el plazo de Paraguay.
 */
export function ConsumerRightsButtons() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 16 }}>
      <TextButton text="BOTÓN DE ARREPENTIMIENTO" onPress={() => void Linking.openURL(LegalLinks.withdrawal)} />
      <TextButton text="BOTÓN DE BAJA DE SERVICIO" onPress={() => void Linking.openURL(LegalLinks.cancelService)} />
    </View>
  );
}
