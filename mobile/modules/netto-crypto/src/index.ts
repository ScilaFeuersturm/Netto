import { requireOptionalNativeModule } from 'expo';

type NettoCryptoModule = {
  pbkdf2(algorithm: 'SHA256' | 'SHA1', password: string, saltBase64: string, iterations: number, keyLength: number): Promise<string>;
};

/** null donde no hay código nativo (tests con Jest, web). */
export default requireOptionalNativeModule<NettoCryptoModule>('NettoCrypto');
