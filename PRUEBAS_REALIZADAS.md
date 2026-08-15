# Pruebas realizadas

Aviso importante de honestidad: este entorno de trabajo no tiene acceso de red a tu proyecto
real de Supabase, Wompi ni Resend (solo puede instalar dependencias desde npm). Por eso, lo
de abajo distingue entre lo que **sí se ejecutó** contra el código real, y lo que se validó
por **lectura/razonamiento de código** porque requiere tus credenciales en vivo.

## Ejecutado realmente en este entorno

- `npm install` sobre el proyecto (con tu `package-lock.json`, sin tocar versiones).
- `npm run build` (Next.js 15.5.21) → **exitoso**, 22/22 páginas, sin errores de TypeScript ni
  de compilación, sobre el proyecto completo (no solo los archivos tocados).
- Revisión de que no quedó ningún uso del parámetro incorrecto `signature` (sin
  `:integrity`) en todo el repositorio.
- Revisión de que `app/api/reservations/route.ts` y `app/api/payments/wompi/webhook/route.ts`
  no fueron alterados por el bug del multiplicador de temporada (seguían usando la tarifa
  real desde el principio).
- Búsqueda de credenciales impresas en consola, rutas absolutas de Windows, y referencias
  rotas de import — sin hallazgos.

## Verificado por revisión de código (requieren tu Supabase/Wompi/Resend reales para probarse en vivo)

| Escenario | Resultado de la revisión |
|---|---|
| Seleccionar check-in / check-out | Lógica en `price-calendar.tsx` correcta: primer clic fija entrada, segundo fija salida, si la segunda fecha es anterior se reinicia como nueva entrada. |
| Rango con fechas ocupadas o bloqueadas | `fetchUnavailableDates` consulta `bookings` (estados `pending`/`confirmed`) y `blocked_dates` por `property_id`; el frontend rechaza el rango y muestra aviso. |
| Fechas pasadas deshabilitadas | El API marca `isPast` con la fecha local (no UTC); el botón queda `disabled`. |
| Precio por día y niveles $/$$/$$$ | Ahora se basan en `rates.amount` real por propiedad (terciles), sin mezclarse entre Santa Marina y Villa Ernesta. |
| Cambio de propiedad | Cada fetch al calendario usa `propertyId`, no hay estado compartido entre propiedades. |
| Cálculo de noches y total | La fecha de salida no se cuenta como noche (`nightsList`); el descuento de la 3ª noche en Villa Ernesta (regla ya existente en `create_public_booking`) se replica igual en la vista previa. |
| Doble reserva | Sigue protegida por la restricción `exclude` en `bookings` + la función `create_public_booking`, sin cambios. |
| Login / logout / rutas protegidas | `middleware.ts` sin cambios: redirige `/admin` a `/login` sin sesión, y `/login`↔`/admin` con sesión. |
| Panel administrativo | Consultas con cliente admin (service role) para listar reservas/pagos; comprobantes de transferencia con URL firmada del bucket privado `payment-proofs`. |
| Transferencia bancaria + comprobante | `/api/transfers/details` expone los datos bancarios reales desde variables de entorno; `/api/transfers/upload` sube a Storage y marca el pago como `under_review`. |
| Webhook de Wompi | Verifica firma con `WOMPI_EVENTS_SECRET` antes de actualizar `payments`/`bookings`; no se tocó. |
| Vista móvil / escritorio | El grid usa `grid-cols-1 md:grid-cols-2`, un mes debajo del otro en móvil, dos meses en escritorio; resumen inferior con `sticky bottom-0`. |
| Página 404 | No se modificó; Next.js genera la página `/_not-found` por defecto (visible en el build). |

## No se pudo probar desde aquí (requiere acción tuya)

- Un pago real o de sandbox contra tu cuenta de Wompi (para confirmar que el 403 ya no
  aparece con tus llaves reales).
- Envío real de correos con tu cuenta de Resend.
- Recuperación de contraseña con un correo real de Supabase Auth.
- Sincronización iCal (`/api/cron/ical-sync`) contra un feed real.

## Recomendación de prueba manual, en orden

1. Ejecuta las migraciones pendientes (ver `INSTRUCCIONES_DESPLIEGUE.md`).
2. Despliega en Vercel.
3. Crea una reserva de prueba en `/reservar` y confirma que el calendario muestra colores
   coherentes con las tarifas que realmente configuraste en Supabase.
4. Prueba "Pagar ahora con Wompi" (ya corregido) y "Pagar con transferencia".
5. Entra a `/admin`, confirma que ves la reserva, el comprobante (si subiste uno), y que
   guardar la "Tasa del dólar" persiste tras recargar.

---

# Pruebas — 2026-08-14 (galería, activar/desactivar propiedades, tasa del dólar)

Mismo aviso de honestidad que arriba: este entorno tampoco tiene tu Supabase real, así que de
nuevo se distingue lo ejecutado de lo verificado por lectura de código.

## Ejecutado realmente en este entorno

- `npm install`, `npm run typecheck` y `npm run build` sobre el proyecto completo →
  **exitosos**, 22/22 páginas, sin errores de TypeScript ni de compilación.
- `npm run start` (build de producción) en `http://localhost:3100` y pruebas de humo con
  `curl` contra rutas reales, sin ninguna variable de Supabase configurada (para comprobar que
  el sitio de contenido no se cae si Supabase no responde):

  | Ruta | Resultado |
  |---|---|
  | `/` | `200` — muestra Santa Marina y Villa Ernesta (fallback "todo activo" al no haber Supabase) |
  | `/propiedades/villa-ernesta` | `200` — la galería en el HTML incluye `frame-1.jpg` a `frame-6.jpg`, confirmando que las 3 fotos nuevas quedaron enlazadas |
  | `/propiedades/santa-marina` | `200` |
  | `/propiedades/no-existe` | `404` (comportamiento sin cambios) |
  | `/reservar` | `200` (la carga de propiedades vía `/api/properties` sí depende de Supabase real, como ya lo hacía antes) |
  | `/api/settings` | `200` con `{"usdToCopRate":4200}` — confirma el valor de respaldo cuando no hay tabla `settings` |
  | `/admin`, `/login`, `/api/properties` | `500` — esperado y **no es una regresión**: `middleware.ts` y estas rutas siempre han requerido `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` reales, con o sin este cambio (se confirmó revisando el log del servidor: el error es "Faltan variables privadas de Supabase" / "URL and Key are required", no algo introducido ahora) |

## Verificado por revisión de código (requiere tu Supabase real para probarse en vivo)

| Escenario | Resultado de la revisión |
|---|---|
| Desactivar una propiedad desde `/admin` | `togglePropertyStatus` actualiza `properties.status`, revalida `/` y `/propiedades/<slug>`; `getActiveProperties`/`isPropertyActive` dejan de listarla y su página pasa a `404` en la siguiente visita |
| Reactivarla | Mismo botón alterna a `active`; vuelve a aparecer en el home y su página vuelve a responder `200` |
| Confirmación antes de desactivar | `PropertyStatusButton` (client component) muestra `confirm()` con el nombre de la propiedad solo al desactivar; al activar no interrumpe |
| Reserva a una propiedad recién desactivada | Ya estaba protegido antes de este cambio: `create_public_booking` exige `status='active'` y `/api/properties` ya filtraba por `status='active'`, así que no se pueden crear reservas nuevas aunque alguien tenga el `id` a mano |
| Guardar la tasa del dólar con un valor inválido (vacío, negativo, texto) | El input es `type="number" required min="1"`; si igual llega un valor inválido, `updateUsdRate` redirige a `/admin?error=rate` sin tocar la base de datos |
| Guardar la tasa del dólar con éxito | Redirige a `/admin?saved=rate`, se ve el aviso verde, y se revalida `/` y `/propiedades/[slug]` además de `/admin` |
| Fallo de Supabase al guardar (tabla `settings` no creada) | Antes fallaba en silencio; ahora `updateUsdRate` revisa el `error` de Supabase y redirige a `/admin?error=rate`, mostrando el aviso rojo |
| Permisos | Ambas acciones nuevas usan el cliente de sesión (`createClient()`), no el de service role, así que quedan sujetas a las mismas políticas RLS `is_admin()` que ya protegen `updateBookingStatus` |

## No se pudo probar desde aquí (requiere tu Supabase real)

- Confirmar en vivo que desactivar Villa Ernesta la oculta del home de tu despliegue real y que
  al reactivarla vuelve a aparecer.
- Confirmar que la tasa del dólar persiste tras recargar contra tu proyecto real (una vez
  ejecutada la migración `20260724_settings_table.sql`, ver `CAMBIOS_REALIZADOS.md`).
- Ver las 3 fotos nuevas de Villa Ernesta ya renderizadas — depende de que copies los archivos
  reales a `public/media/villa-ernesta/frame-4.jpg`, `frame-5.jpg`, `frame-6.jpg`.

## Recomendación de prueba manual, en orden

1. Copia las 3 fotos nuevas a `public/media/villa-ernesta/` con los nombres indicados arriba.
2. Ejecuta (si no lo has hecho) `supabase/migrations/20260724_settings_table.sql` en tu proyecto.
3. Despliega y entra a `/admin` → cambia la "Tasa del dólar" → confirma el aviso verde y que el
   valor persiste al recargar `/admin` y al ver el cotizador en `/propiedades/villa-ernesta`.
4. En la sección "Propiedades", desactiva Villa Ernesta → confirma que desaparece de `/` y que
   `/propiedades/villa-ernesta` da 404 → actívala de nuevo y confirma que vuelve a aparecer.

---

# Pruebas — 2026-08-14 (segunda parte): precios por huésped y temporadas

## Ejecutado realmente en este entorno

- `npm run typecheck` y `npm run build` → **exitosos**, 22/22 páginas, sin errores.
- **27 casos de prueba aritméticos** ejecutados con `node` contra una copia literal (sin tipos,
  para poder correrla fuera de Next.js) de la lógica real de `getFormulaPrice`,
  `getSeasonForDate`, `computeNightlyPrices` y `computeStayTotal` de
  `lib/booking/pricing.ts` — **los 27 pasaron**:

  | Caso | Resultado |
  |---|---|
  | Santa Marina, 2 huéspedes, temporada baja | `$200.000` ✅ (el número pedido) |
  | Santa Marina, 3 huéspedes, temporada baja | `$220.000` ✅ (+20.000) |
  | Santa Marina, 1 huésped (no hay recargo por debajo de la base) | `$200.000` ✅ |
  | Santa Marina, 2 y 3 huéspedes, viernes/sábado (fin de semana) | `$320.000` / `$340.000` ✅ |
  | Santa Marina, 2 y 3 huéspedes, 24 de diciembre (temporada alta) | `$450.000` / `$470.000` ✅ |
  | Santa Marina, pasadía (no existe esa modalidad ahí) | `null` ✅ |
  | Villa Ernesta, pasadía 2 huéspedes (incluso en fecha de temporada alta) | `$200.000` ✅ (no varía por temporada) |
  | Villa Ernesta, pasadía 6 huéspedes | `$280.000` ✅ (200.000 + 4×20.000) |
  | Villa Ernesta, alojamiento 2 huéspedes | `$300.000` ✅ |
  | Villa Ernesta, alojamiento 20 huéspedes (capacidad máxima) | `$750.000` ✅ (300.000 + 18×25.000) |
  | Clasificación de temporada en 10 fechas de control (martes, viernes, sábado, domingo, límites de dic/ene/jun/jul/ago) | Las 10 correctas ✅ |
  | Villa Ernesta, 3 noches alojamiento 2 huéspedes: subtotal / descuento / total | `$900.000` / `$150.000` (50% de la última noche) / `$750.000` ✅ |
  | Villa Ernesta, 2 noches (sin descuento, es antes de la 3ra noche) | descuento `$0`, total `$600.000` ✅ |
  | Santa Marina, estadía de 3 noches que cruza de temporada baja a fin de semana (jueves-baja + viernes-finde + sábado-finde, 3 huéspedes) | `$220.000 + $340.000 + $340.000 = $900.000` ✅ — confirma que ya no se cobra una sola tarifa fija multiplicada por las noches, sino cada noche a su tarifa real |

- `npm run start` + `curl`: `/`, `/propiedades/santa-marina` y `/propiedades/villa-ernesta`
  responden `200`; se confirmó en el HTML servido que ya dicen "Máximo 3 huéspedes",
  "$200.000 COP / noche" (Santa Marina) y "$200.000 COP / pasadía" (Villa Ernesta); el
  cotizador rápido de cada página, renderizado en el servidor con sus valores por defecto
  (2 huéspedes, 1 noche/día), muestra `$200.000` en Santa Marina y `$300.000` en Villa
  Ernesta — coincide con la base pedida para 2 huéspedes en ambas.

## Verificado por revisión de código (requiere tu Supabase real para probarse en vivo)

| Escenario | Resultado de la revisión |
|---|---|
| `create_public_booking` (SQL) calcula el mismo total que la vista previa del calendario | Ambos usan exactamente la misma fórmula (`calculate_stay_price` en SQL, `getFormulaPrice` en TS), sumando noche por noche — se revisaron línea por línea para que coincidan |
| Capacidad de Santa Marina | La migración actualiza `properties.capacity` a 3; `create_public_booking` sigue rechazando con `CAPACITY_EXCEEDED` cualquier reserva con más huéspedes que la capacidad de la propiedad |
| Colores del calendario | `calendar-day.tsx`: verde=`low`, naranja=`weekend`, rojo=`high`, gris sólido=`unavailable` (con prioridad ocupado > alta > fin de semana > baja, aplicada en ese orden en el código) |
| Reserva real con precio inválido (propiedad/modalidad sin fórmula, ej. pasadía en Santa Marina) | `calculate_stay_price` devuelve `null` → `create_public_booking` lanza `RATE_NOT_CONFIGURED`, igual que antes con la tabla `rates` vacía |
| Reservas ya existentes en la base de datos | No se tocan: la migración solo cambia funciones y un valor de columna (`capacity`), no modifica filas de `bookings` |

## No se pudo probar desde aquí (requiere tu Supabase real)

- Ejecutar la migración `20260814_formula_pricing.sql` y confirmar que `create_public_booking`
  sigue funcionando end-to-end (sin errores de sintaxis PL/pgSQL en tu versión de Postgres) —
  es la prueba más importante pendiente. Se revisó la sintaxis con mucho cuidado, pero al no
  tener acceso a un Supabase real no se pudo *ejecutar* la función.
- Confirmar en vivo que una reserva real de 3+ noches en Villa Ernesta descuenta el 50% de la
  última noche en el total que realmente se guarda en `bookings.total_amount`.
- Confirmar en vivo que el calendario de `/reservar` pinta verde/naranja/rojo/gris como se
  espera con datos reales de reservas y bloqueos.

## Recomendación de prueba manual, en orden

1. Aplica primero `20260814_formula_pricing.sql` en un proyecto de **pruebas** de Supabase (no
   directo en producción), ya que reescribe la función que cobra las reservas.
2. Haz una reserva de prueba de Santa Marina para 2 y para 3 huéspedes en una fecha de
   temporada baja, y confirma que el total es `$200.000` y `$220.000` por noche.
3. Haz una reserva de prueba de Villa Ernesta de pasadía y de alojamiento, con y sin huéspedes
   adicionales, y con 3+ noches de alojamiento para confirmar el descuento de la última noche.
4. Abre el calendario en `/reservar` y confirma visualmente los 4 colores (verde/naranja/rojo/
   gris) en fechas de cada tipo.
5. Solo entonces aplícala en tu proyecto de producción.

---

# Pruebas — 2026-08-15: consultar y cancelar reserva (`/mi-reserva`)

Esta sí se pudo probar de punta a punta contra tu Supabase real (ya conectado desde hoy),
`npm run dev` corriendo, y `fetch` real a las rutas nuevas — no solo revisión de código:

1. Se creó una reserva de prueba real (Santa Marina, 2 huéspedes, 2 noches, fecha futura) vía
   `create_public_booking`, igual que haría un huésped real.
2. `POST /api/reservations/lookup` con el código correcto pero **correo equivocado** →
   `404` (no revela si el código existe).
3. `POST /api/reservations/lookup` con código + correo correctos → `200`, con
   `status: "pending"`, `canCancel: true` y el total exacto (`$520.000`, 2 noches en fin de
   semana con recargo por temporada — coincide con lo esperado por la fórmula).
4. `POST /api/reservations/cancel` con los datos correctos → `200`, `status: "cancelled"`.
5. Se repitió la cancelación → `409` con el mensaje "ya estaba cancelada" (no se puede
   cancelar dos veces).
6. Se confirmó directo en la tabla `bookings` que el estado quedó en `cancelled`.
7. Se llamó a `check_property_availability` para esas mismas fechas → devolvió disponible,
   confirmando que cancelar libera el calendario de inmediato.
8. Limpieza: se borró la reserva y el cliente de prueba; `bookings` volvió a `0` filas.

Los 7 pasos dieron el resultado esperado. No se probó el envío real de WhatsApp/correo al
cancelar porque la cancelación no dispara ninguna notificación automática (deliberado: no hay
política de reembolso definida todavía, así que el siguiente paso siempre es contacto manual).

---

# Pruebas — 2026-08-15: aprobar/rechazar transferencias

Prueba real de punta a punta contra Supabase y el servidor de desarrollo real (subida de
archivo multipart incluida, no solo llamadas a la base de datos):

1. Se creó una reserva de prueba real con anticipo (`payment_option: 'deposit'`) → total
   `$400.000`, anticipo `$200.000`.
2. Se subió un comprobante real (PNG válido de 1×1) vía `POST /api/transfers/upload`, igual
   que haría el navegador del huésped → `200 OK`.
3. Se verificó en `payments` que el monto guardado es `$200.000` (el anticipo real), **no
   `$0`** como pasaba antes de la corrección.
4. Se aplicó la misma lógica de la acción "Aprobar" del panel (marcar pago `approved` con
   `paid_at`, reserva `payment_status='paid'`, reserva `status='confirmed'` solo si seguía
   `pending`) → se confirmó que la reserva quedó `confirmed` + `paid`.
5. Se recalculó "Ingresos aprobados" con la misma fórmula que usa `/admin`
   (`payments.filter(status==='approved').sum(amount)`) → dio `$200.000`, coincidiendo con el
   anticipo — antes de esta corrección habría dado `$0`.
6. Limpieza: se borraron el pago, la reserva, el cliente de prueba, **y el archivo subido al
   bucket `payment-proofs`** (para no dejar basura en tu storage real).

Todos los pasos dieron el resultado esperado. No se probó el botón "Rechazar" con una subida
real adicional (la lógica es simétrica y ya se revisó en el código), ni el envío de
notificación al huésped al aprobar/rechazar, porque hoy ninguna de las dos acciones dispara
correo/WhatsApp automático (mismo criterio que la cancelación: no hay flujo de notificación de
cambios de estado todavía, señalado en la respuesta anterior sobre qué falta en el sistema).
