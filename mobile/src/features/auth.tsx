import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/ui/primitives';
import { ScreenScroll } from '@/ui/Screen';
import { useTheme } from '@/ui/theme';

const EMAIL_REGEX = /^[a-zA-Z0-9+._%\-]{1,256}@[a-zA-Z0-9][a-zA-Z0-9\-]{0,64}(\.[a-zA-Z0-9][a-zA-Z0-9\-]{0,25})+$/;

/** Mismo criterio que Patterns.EMAIL_ADDRESS de Android. */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <ScreenScroll safeTop contentStyle={{ paddingHorizontal: 24, paddingTop: 32 }}>
      <Text variant="headlineMedium" color={colors.primary} style={{ marginTop: 16 }}>
        Netto
      </Text>
      <View style={{ gap: 4, marginBottom: 8 }}>
        <Text variant="titleLarge" color={colors.onBackground}>
          {title}
        </Text>
        <Text color={colors.onSurfaceVariant}>{subtitle}</Text>
      </View>
      {children}
    </ScreenScroll>
  );
}
