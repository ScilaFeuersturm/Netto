/**
 * Documentos legales publicados con GitHub Pages desde la carpeta docs/ del repo.
 * Al cambiar los términos o la política, subir LEGAL_VERSION: queda guardada en la cuenta
 * de cada usuario la versión que aceptó al registrarse.
 */
const BASE_URL = 'https://scilafeuersturm.github.io/Netto';

export const LEGAL_VERSION = 3;

export const LegalLinks = {
  privacy: `${BASE_URL}/privacidad.html`,
  terms: `${BASE_URL}/terminos.html`,
  deleteAccount: `${BASE_URL}/eliminar-cuenta.html`,
  // Botones que exige la Disposición 954/2025 (Argentina); la página explica también el plazo de Paraguay.
  withdrawal: `${BASE_URL}/arrepentimiento.html#arrepentimiento`,
  cancelService: `${BASE_URL}/arrepentimiento.html#baja`,
};

export const SUPPORT_EMAIL = 'soporte.netto@gmail.com';
