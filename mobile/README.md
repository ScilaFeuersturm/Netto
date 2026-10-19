# Netto (Expo · Android + iOS)

App de finanzas personales: facturas y vencimientos, ingresos en varias monedas (PYG, ARS, USD),
modelos de ahorro (50/30/20, etc.), reportes y escaneo de facturas con OCR.

Funciona sin conexión (local-first): los datos se guardan en una base SQLite cifrada en el teléfono y
se sincronizan con Supabase (`../supabase`), donde viven las cuentas.

Es la migración a Expo de la app Android nativa (Kotlin + Compose), que quedó en el historial de git.

## Cómo correrla

### Backend (Supabase local)

Requiere Docker. Desde la raíz del repo:

```bash
npx supabase start          # levanta Postgres, Auth y la API en http://127.0.0.1:54321
node --test supabase/tests/backend.test.mjs   # seguridad por fila, sincronización, Premium, borrado de cuenta
node supabase/scripts/cuentas-de-prueba.mjs   # crea free@netto.test y premium@netto.test (contraseña NettoPrueba1)
```

Para pasar una cuenta local a Premium o volverla al plan gratis:
`node supabase/scripts/cuentas-de-prueba.mjs --premium <email>` (o `--gratis <email>`).

La app toma la URL y la clave pública de `mobile/.env.local` (ver `.env.example`).

### App

La app usa módulos nativos (OCR, SQLite, notificaciones), así que **no funciona en Expo Go**:
hace falta un *development build*.

```bash
npm install

# iOS (necesita Xcode)
npx expo run:ios

# Android (necesita Android Studio / SDK)
npx expo run:android
```

Después de la primera compilación, alcanza con `npx expo start` para seguir desarrollando.

Builds en la nube con EAS (`eas.json`):

| Perfil | Para qué | Backend |
| --- | --- | --- |
| `development` | App de desarrollo que carga el código desde Metro | El de `.env.local` |
| `preview` | App instalable para probar en teléfonos reales | Supabase en la nube |
| `production` | La que va a TestFlight, Play y las tiendas (sube el número de build sola) | Supabase en la nube |

```bash
npx eas-cli@latest build --profile preview --platform all
```

El ícono y sus variantes se generan con `node scripts/generar-iconos.mjs` (no hace falta instalar nada).

Pruebas de punta a punta (Maestro, con la app corriendo y el backend levantado). Son cinco partes que
se corren en orden: registro, plan gratis, volver a entrar, Premium y editar el perfil:

```bash
~/.maestro/bin/maestro test -e EMAIL=ana-$(date +%s)@example.com .maestro/
```

Chequeos:

```bash
npm test            # tests de dominio, cálculos, OCR, sincronización y seguridad
npm run typecheck
npm run lint
npx expo-doctor
```

## Estructura

```
src/
  app/            Rutas (Expo Router). Cada archivo es una pantalla.
    _layout.tsx   Muestra login / onboarding / app según el estado de la sesión.
    (tabs)/       Inicio, Facturas, Ahorro, Reportes + barras superior e inferior.
    obligation.tsx, scan.tsx, income.tsx, profile.tsx, login.tsx, register.tsx, onboarding.tsx
  domain/         Monedas y conversión, formato de montos, fechas, modelos y categorías.
  data/           SQLite cifrada, repositorios, cuentas (Supabase Auth), sesión, cotizaciones.
  sync/           Sincronización con Supabase (subir pendientes, bajar cambios, "gana el último").
  features/       Cálculos de cada pantalla como funciones puras (lo que hacían los ViewModels).
  state/          AppDataProvider: carga los datos del usuario y se refresca ante cada cambio.
                  Premium: `data/premium.ts` (estado) y `features/Premium.tsx` (bloqueo y beneficios).
  services/       Recordatorios con notificaciones locales.
  ocr/            Lectura de texto de facturas y extracción de monto/fecha.
  ui/             Tema (colores, tipografía) y componentes compartidos.
```

## Equivalencias con la versión Android

| Android (Kotlin)                       | Expo                                                    |
| -------------------------------------- | ------------------------------------------------------- |
| Jetpack Compose + Material 3           | React Native + componentes propios con el mismo diseño |
| Navigation Compose                     | Expo Router (rutas protegidas por estado de sesión)    |
| Hilt + ViewModels + Flow               | `AppDataProvider` + funciones en `features/selectors`  |
| Room                                   | `expo-sqlite` con SQLCipher (clave en Keychain/Keystore)|
| DataStore                              | `expo-sqlite/kv-store` (solo datos no sensibles)        |
| Cuentas locales con PBKDF2             | Supabase Auth; PBKDF2 nativo solo para desbloquear offline |
| WorkManager (revisión diaria)          | `expo-notifications` con avisos programados por factura |
| ML Kit Text Recognition                | `expo-text-extractor` (ML Kit en Android, Vision en iOS)|
| Cámara/galería + corrección EXIF       | `expo-image-picker` + `expo-image-manipulator`          |

### Diferencias de comportamiento

- **Recordatorios:** en vez de revisar una vez por día en segundo plano (iOS no lo permite de forma
  confiable), cada vez que cambian las facturas se programan avisos a las 9:00: unos días antes
  (según el plan), el día del vencimiento y el día siguiente si sigue impaga. iOS limita a 64 avisos
  pendientes, así que se programan los 60 más próximos.
- **Cuentas en la nube:** las cuentas viven en Supabase y los datos se sincronizan entre dispositivos.
  Cerrar sesión borra los datos del teléfono (vuelven al entrar de nuevo).
- **Bloqueo por inactividad:** después de 5 minutos sin uso se pide Face ID/huella o la contraseña.

## Plan gratis y Premium

| Plan gratis | Premium |
| --- | --- |
| Cargar facturas e ingresos a mano, marcar pagos, saldo del mes, respaldo en la nube | Todo lo gratis + escaneo, avisos de vencimiento, modelos de ahorro, reportes y atención prioritaria |

Quién tiene Premium lo decide el servidor (tabla `entitlements`, que los usuarios solo pueden leer).
La app la consulta en cada sincronización y guarda una copia para funcionar sin conexión.
Las compras (RevenueCat) todavía no están conectadas: la pantalla de planes muestra los precios
(2,99 USD por mes, 19,99 USD por año, 7 días de prueba) con el botón desactivado.
