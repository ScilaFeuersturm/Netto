# Formularios de privacidad de las tiendas

Respuestas para completar **App Privacy** (App Store Connect) y **Seguridad de los datos** (Google Play Console). Salen de lo que la app hace hoy y de la [política de privacidad](../docs/privacidad.html); si cambia una, hay que cambiar la otra.

Las filas marcadas **(con anuncios)** o **(con Premium)** se agregan recién cuando se integren AdMob o RevenueCat. Hasta entonces, se declaran solo las demás.

## Datos generales (las dos tiendas)

| Campo | Valor |
|---|---|
| Política de privacidad | https://scilafeuersturm.github.io/Netto/privacidad.html |
| Términos (Apple: EULA personalizado, opcional) | https://scilafeuersturm.github.io/Netto/terminos.html |
| Eliminar la cuenta (Google lo exige) | https://scilafeuersturm.github.io/Netto/eliminar-cuenta.html |
| Email de soporte | soporte.netto@gmail.com |

## Lo que NO se declara como recopilado

Las tiendas solo cuentan lo que sale del teléfono:

- **Fotos de facturas**: el texto se lee en el teléfono y la imagen no se sube ni se guarda.
- **Biometría**: la verifica el sistema; la app no recibe la huella ni el rostro.
- **Recordatorios**: se programan en el teléfono, sin servidor de notificaciones.
- **Cotizaciones**: la consulta a open.er-api.com no lleva datos del usuario.

## Apple: App Privacy

**¿Recopilás datos?** Sí.

| Tipo de dato (categoría de Apple) | Vinculado al usuario | Usado para rastreo | Finalidad |
|---|---|---|---|
| Contact Info → Name | Sí | No | App Functionality |
| Contact Info → Email Address | Sí | No | App Functionality |
| Financial Info → Other Financial Info (facturas, ingresos, pagos) | Sí | No | App Functionality |
| Identifiers → User ID | Sí | No | App Functionality |
| Purchases → Purchase History **(con Premium)** | Sí | No | App Functionality |
| Identifiers → Device ID **(con anuncios)** | No | Sí, si acepta la publicidad personalizada | Third-Party Advertising |
| Usage Data → Advertising Data **(con anuncios)** | No | Sí, si acepta la publicidad personalizada | Third-Party Advertising |
| Usage Data → Product Interaction **(con anuncios)** | No | No | Third-Party Advertising, Analytics |
| Location → Coarse Location **(con anuncios)** | No | No | Third-Party Advertising |
| Diagnostics → Crash Data, Performance Data **(con anuncios)** | No | No | Analytics |

Las filas de anuncios siguen la [guía de Google para AdMob en App Store](https://developers.google.com/admob/ios/privacy/data-disclosure). Revisarla al integrar, por si cambió.

Si se agrega rastreo publicitario, hay que mostrar el aviso de App Tracking Transparency (ATT) antes de pedir el identificador.

**Cifrado (Export Compliance):** la app usa solo cifrado estándar (HTTPS y SQLCipher con AES), que está exento. Se responde "usa cifrado exento" y se puede agregar `ITSAppUsesNonExemptEncryption: false` en `app.json` para que no lo pregunte en cada build.

## Google Play: Seguridad de los datos

**¿Tu app recopila o comparte alguno de los tipos de datos requeridos?** Sí.
**¿Todos los datos se encriptan en tránsito?** Sí.
**¿Ofrecés una forma de pedir que se borren los datos?** Sí: dentro de la app (Perfil → Borrar mi cuenta) y en la URL de eliminación de arriba.

| Tipo de dato (categoría de Google) | Recopilado | Compartido | ¿Opcional? | Finalidad |
|---|---|---|---|---|
| Información personal → Nombre | Sí | No | No | Funcionalidad de la app, Administración de la cuenta |
| Información personal → Dirección de correo electrónico | Sí | No | No | Funcionalidad de la app, Administración de la cuenta |
| Información personal → ID de usuario | Sí | No | No | Funcionalidad de la app, Administración de la cuenta |
| Información financiera → Otra información financiera | Sí | No | No | Funcionalidad de la app |
| Información financiera → Historial de compras **(con Premium)** | Sí | No | No | Funcionalidad de la app |
| Dispositivo u otros IDs **(con anuncios)** | Sí | Sí (AdMob) | No | Publicidad o marketing, Estadísticas, Prevención de fraudes |
| Actividad en la app → Interacciones con la app **(con anuncios)** | Sí | Sí (AdMob) | No | Publicidad o marketing, Estadísticas |
| Información y rendimiento de la app → Registros de fallas, Diagnóstico **(con anuncios)** | Sí | Sí (AdMob) | No | Estadísticas |
| Ubicación aproximada **(con anuncios)** | Sí | Sí (AdMob) | No | Publicidad o marketing |

Los datos que procesa Supabase no cuentan como "compartidos": Google excluye a los proveedores que procesan datos en nombre de la app. Las filas de anuncios siguen la [guía de Google para AdMob en Play](https://developers.google.com/admob/android/privacy/play-data-disclosure).

## Otros formularios de Play Console

- **Funciones financieras**: elegir "La app no ofrece ninguna de estas funciones financieras". Netto organiza gastos: no da préstamos, no mueve dinero y no ofrece inversiones.
- **Anuncios**: "No" hasta integrar AdMob.
- **Público objetivo**: mayores de 18.
- **Acceso a la app**: Google pide una cuenta de prueba para revisar la app. Crear una que no sea de nadie real, como premium@netto.test, cuando exista el plan Premium.
