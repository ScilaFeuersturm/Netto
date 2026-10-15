import { CryptoDigestAlgorithm, digest, getRandomValues } from 'expo-crypto';

/**
 * Hermes (el motor de JavaScript de la app) no trae WebCrypto. Supabase lo usa para PKCE (el código
 * que protege los links de los emails): sin `crypto.getRandomValues` genera el verificador con
 * Math.random (predecible) y sin `crypto.subtle.digest` manda el desafío sin hashear. Se completan
 * con las implementaciones nativas de expo-crypto.
 */
type MinimalCrypto = {
  getRandomValues?: typeof getRandomValues;
  subtle?: { digest?: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer> };
};

const globalWithCrypto = globalThis as unknown as { crypto?: MinimalCrypto };
const cryptoObject: MinimalCrypto = globalWithCrypto.crypto ?? {};

if (typeof cryptoObject.getRandomValues !== 'function') {
  cryptoObject.getRandomValues = getRandomValues;
}

if (typeof cryptoObject.subtle?.digest !== 'function') {
  const algorithms: Record<string, CryptoDigestAlgorithm> = {
    'SHA-1': CryptoDigestAlgorithm.SHA1,
    'SHA-256': CryptoDigestAlgorithm.SHA256,
    'SHA-384': CryptoDigestAlgorithm.SHA384,
    'SHA-512': CryptoDigestAlgorithm.SHA512,
  };
  cryptoObject.subtle = {
    ...cryptoObject.subtle,
    digest: (algorithm: string, data: BufferSource) => {
      const native = algorithms[algorithm.toUpperCase()];
      if (!native) return Promise.reject(new Error(`Algoritmo no soportado: ${algorithm}`));
      return digest(native, data);
    },
  };
}

globalWithCrypto.crypto = cryptoObject;
