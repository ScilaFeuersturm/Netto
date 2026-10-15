import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha1 } from '@noble/hashes/legacy.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { getRandomBytes } from 'expo-crypto';

import NettoCrypto from '../../modules/netto-crypto/src';

/**
 * Hash de contraseñas con PBKDF2 y sal aleatoria. El resultado se guarda como
 * "algoritmo$iteraciones$sal$hash" (mismo formato que la versión Android) para poder
 * verificarlo aunque cambien los parámetros. El cálculo se hace con código nativo
 * (módulo local netto-crypto); en JavaScript puro tardaba decenas de segundos.
 * La versión JavaScript queda solo para donde no hay código nativo (tests).
 */
const ALGORITHM = 'PBKDF2WithHmacSHA256';
const ITERATIONS = 120_000;
const KEY_LENGTH_BYTES = 32;
const SALT_BYTES = 16;
const SEPARATOR = '$';

const HASHES = {
  PBKDF2WithHmacSHA256: sha256,
  PBKDF2WithHmacSHA1: sha1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = getRandomBytes(SALT_BYTES);
  const hash = await derive(password, salt, ITERATIONS, ALGORITHM);
  return [ALGORITHM, String(ITERATIONS), toBase64(salt), toBase64(hash)].join(SEPARATOR);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(SEPARATOR);
  if (parts.length !== 4) return false;
  const [algorithm, iterationsText, saltText, hashText] = parts;
  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || !(algorithm in HASHES)) return false;
  const expected = fromBase64(hashText);
  const actual = await derive(password, fromBase64(saltText), iterations, algorithm as keyof typeof HASHES, expected.length);
  return constantTimeEquals(expected, actual);
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number,
  algorithm: keyof typeof HASHES,
  length = KEY_LENGTH_BYTES,
): Promise<Uint8Array> {
  if (NettoCrypto) {
    const hash = algorithm === 'PBKDF2WithHmacSHA256' ? 'SHA256' : 'SHA1';
    return fromBase64(await NettoCrypto.pbkdf2(hash, password, toBase64(salt), iterations, length));
  }
  return pbkdf2Async(HASHES[algorithm], new TextEncoder().encode(password), salt, { c: iterations, dkLen: length });
}

function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64[n & 63] : '=';
  }
  return out;
}

function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = B64.indexOf(char);
    if (value < 0) continue;
    buffer = ((buffer << 6) | value) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}
