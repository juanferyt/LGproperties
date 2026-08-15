# Cambios realizados

Ningún archivo, carpeta, tabla, columna, variable de entorno ni credencial fue eliminado.
`.env.local` se conservó exactamente como estaba (con tus valores reales). `.env.example`
ya tenía placeholders de una entrega anterior y se dejó igual. `app/admin/page.tsx.bak` se
dejó tal cual (es un backup inerte: Next.js no lo trata como ruta).

## 1. Corrección crítica — Wompi devolvía error 403 (CloudFront)

**Archivo:** `app/api/payments/wompi/checkout/route.ts`

El checkout hospedado de Wompi requiere el parámetro de la URL `signature:integrity`. El
código generaba `signature` (sin `:integrity`), lo que hacía que Wompi/CloudFront bloqueara
la petición. Se corrigió el nombre del parámetro y se agregó una validación para no generar
un checkout con monto inválido (0 o vacío).

## 2. Corrección crítica — el calendario multiplicaba precios inventados

**Archivos:** `lib/booking/pricing.ts`, `app/api/booking-calendar/route.ts`,
`components/booking/calendar-day.tsx`, `components/booking/price-calendar.tsx`

Encontré que `resolveRateForDate()` tomaba la tarifa real de `rates` y la multiplicaba por
1.35x (temporada alta) o 1.2x (fin de semana), usando fechas de temporada codificadas en el
código (no en Supabase). Esto:

- Contradice la regla de no inventar precios ni promociones.
- Generaba un total distinto en el calendario respecto al que realmente registra el backend
  al crear la reserva (que sí usa `rates` directamente vía la función SQL
  `create_public_booking`, sin multiplicador).

Se quitó el multiplicador: el calendario ahora muestra siempre el monto real de `rates`. Los
niveles $/$$/$$$ (verde/amarillo/salmón) vuelven a calcularse por terciles de las tarifas
reales de cada propiedad, como se pidió originalmente, en vez de por temporada. El campo
`season` se conservó (no se borró la función `getSeasonForDate`) como dato informativo, pero
ya no afecta el precio ni el color. Si se quiere tarifa distinta en fin de semana o en fechas
puntuales, ya es posible usando filas reales en `rates` (`weekend_only`, `start_date`,
`end_date`) — no hace falta ni conviene tocar código para eso.

## 3. Corrección — faltaba la tabla `settings`

**Archivo nuevo:** `supabase/migrations/20260724_settings_table.sql`

`app/api/settings/route.ts`, `app/admin/actions.ts` (`updateUsdRate`) y `app/admin/page.tsx`
ya leían/escribían una tabla `settings` que nunca se creó en el esquema. El selector de "Tasa
del dólar" del panel administrativo guardaba en silencio sin error visible, pero no
persistía nada. Se agregó la tabla (`if not exists`, no destructiva) con RLS y una política
para administradores, igual al patrón ya usado en el resto de `schema.sql`.

## 4. Mejora de rendimiento — llamadas repetidas a `/api/settings`

**Archivos:** `components/booking/calendar-day.tsx`, `components/booking/calendar-summary.tsx`,
`components/booking/price-calendar.tsx`

Cada celda del calendario (hasta ~60 por mes × 2 meses) y la tarjeta de resumen hacían cada
una su propia petición a `/api/settings` para obtener la tasa USD/COP. Se dejó una sola
petición en el componente padre (`PriceCalendar`) y se pasa hacia abajo por props. Mismo
resultado visual, muchas menos peticiones.

## 5. Se mantuvo sin cambios (ya funcionaba o es una mejora legítima de otra sesión)

- Flujo de pago por transferencia bancaria (`app/api/transfers/details`,
  `app/api/transfers/upload`, y la UI en `BookingForm.tsx`) — ya estaba bien conectado al
  bucket real `payment-proofs` de Supabase (creado desde el `schema.sql` original).
- Visor de comprobantes de pago en el panel admin (URLs firmadas de Supabase Storage).
- Precio en USD junto al COP en el calendario, el resumen y la cotización rápida
  (`components/BookingCalculator.tsx`), una vez corregido para que use el monto real (punto 2).
- Todo lo entregado previamente: calendario de reservas, disponibilidad en tiempo real,
  autenticación, panel administrativo, reservas, Supabase SSR, webhook de Wompi.

## Archivos modificados en esta revisión

- `app/api/payments/wompi/checkout/route.ts`
- `lib/booking/pricing.ts`
- `app/api/booking-calendar/route.ts`
- `components/booking/calendar-day.tsx`
- `components/booking/calendar-summary.tsx`
- `components/booking/price-calendar.tsx`
- `INSTRUCCIONES_DESPLIEGUE.md` (se le agregó información, no se quitó nada)

## Archivos nuevos

- `supabase/migrations/20260724_settings_table.sql`
- `CAMBIOS_REALIZADOS.md` (este archivo)
- `PRUEBAS_REALIZADAS.md`

## `npm run build`

✅ Exitoso — 22/22 páginas generadas, sin errores de TypeScript ni de compilación.

## Pasos externos pendientes

1. Ejecutar `supabase/migrations/20260724_settings_table.sql` en Supabase (además de la de
   `20260723` si aún no la corriste).
2. Volver a desplegar en Vercel para que tome la corrección de Wompi.
3. Probar el botón "Pagar ahora con Wompi" de nuevo — debería abrir el checkout sin el 403.
4. Ver `PRUEBAS_REALIZADAS.md` para el detalle de qué se pudo y no se pudo probar desde aquí.

---

# Cambios — 2026-08-14

Igual que antes: nada fue eliminado. Todo lo nuevo es aditivo.

## 6. Nuevas fotos en la galería de Villa Ernesta

**Archivo:** `data/properties.ts`

Se agregaron 3 posiciones nuevas al arreglo `gallery` de Villa Ernesta:
`/media/villa-ernesta/frame-4.jpg`, `frame-5.jpg` y `frame-6.jpg`.

**Pendiente de tu parte:** este entorno no tiene forma de recibir los archivos de imagen que
compartiste en el chat como binario, así que solo se referenciaron las rutas. Copia los 3
archivos reales a `public/media/villa-ernesta/` con exactamente esos 3 nombres
(`frame-4.jpg`, `frame-5.jpg`, `frame-6.jpg`) y la galería los mostrará sin tocar más código.
Nota: una de las 3 fotos que enviaste parece la fachada de un local con el letrero "Salón
Secial" (no se ve como Villa Ernesta) — igual se dejó lista la posición por si es correcta,
confírmalo antes de subirla.

## 7. Activar/desactivar propiedades desde el panel administrativo

**Archivos nuevos:** `lib/property-status.ts`, `components/admin/PropertyStatusButton.tsx`
**Archivos modificados:** `app/admin/actions.ts`, `app/admin/page.tsx`, `app/page.tsx`,
`app/propiedades/[slug]/page.tsx`

La tabla `properties` de Supabase ya tenía una columna `status` (`active`/`inactive`, ver
`schema.sql`), y `create_public_booking` y `/api/properties` ya la respetaban, pero no existía
ninguna forma de cambiarla desde el panel ni de reflejarla en el sitio público (que lee el
contenido de mercadeo — fotos, descripciones, video — desde `data/properties.ts`, un archivo
estático).

Se agregó:

- Una sección "Propiedades" en `/admin` con un botón Activar/Desactivar por propiedad, que pide
  confirmación antes de desactivar (acción que oculta la propiedad del sitio de inmediato).
- La acción de servidor `togglePropertyStatus` (mismo patrón de seguridad que
  `updateBookingStatus`/`updateUsdRate`: usa el cliente con la sesión del admin, protegido por
  las políticas RLS `is_admin()` ya existentes, no el cliente de service role).
- `lib/property-status.ts`: helper que cruza `data/properties.ts` (contenido) con
  `properties.status` de Supabase (estado). Si Supabase no responde, asume todo activo — igual
  que ya hacía `lib/currency.ts` con la tasa del dólar — para que el sitio nunca se caiga por
  esto.
- La página de inicio (`app/page.tsx`) ahora es un server component async que oculta del listado
  cualquier propiedad desactivada (y muestra un aviso si no queda ninguna activa).
- La página de cada propiedad (`app/propiedades/[slug]/page.tsx`) devuelve 404 si esa propiedad
  fue desactivada — igual que si no existiera, así no queda accesible por enlace directo.
- El formulario público de reservas (`/reservar`, vía `/api/properties`) y la función SQL
  `create_public_booking` **ya** filtraban por `status='active'` desde antes; no fue necesario
  tocarlos.

## 8. Tasa del dólar configurable desde administración — verificación y mejoras

**Archivo modificado:** `app/admin/actions.ts`, `app/admin/page.tsx`

El mecanismo (tabla `settings`, `/api/settings`, el formulario en `/admin`) ya estaba
implementado en la entrega anterior. Se revisó de punta a punta y se mejoró:

- `updateUsdRate` ahora revalida también `/` y `/propiedades/[slug]` (antes solo revalidaba
  `/admin`), porque la tasa se usa en el cotizador y en el calendario de precios del sitio
  público, no solo en el panel.
- Ambas acciones (`updateUsdRate` y `togglePropertyStatus`) ahora redirigen a `/admin?saved=…`
  o `/admin?error=…`, y el panel muestra un aviso visible de éxito o error — antes un fallo de
  Supabase se guardaba en silencio sin ningún mensaje.
- El campo de la tasa se marcó `required` para no poder enviarlo vacío.

**Sigue pendiente de tu parte** (no se puede hacer desde este entorno sin tus credenciales):
ejecutar `supabase/migrations/20260724_settings_table.sql` contra tu proyecto real de Supabase
si todavía no lo has hecho — sin esa tabla, el guardado seguirá fallando (ahora sí mostrando el
aviso de error en rojo, en vez de fallar en silencio).

## Archivos nuevos (2026-08-14)

- `lib/property-status.ts`
- `components/admin/PropertyStatusButton.tsx`

## Archivos modificados (2026-08-14)

- `data/properties.ts`
- `app/admin/actions.ts`
- `app/admin/page.tsx`
- `app/page.tsx`
- `app/propiedades/[slug]/page.tsx`

## `npm run typecheck` y `npm run build`

✅ Ambos exitosos tras los cambios — 22/22 páginas generadas, sin errores de TypeScript ni de
compilación. Ver `PRUEBAS_REALIZADAS.md` para el detalle de las pruebas de humo ejecutadas
contra `npm run start`.

---

# Cambios — 2026-08-14 (segunda parte): precios por huésped y temporadas reales

**Archivo nuevo:** `supabase/migrations/20260814_formula_pricing.sql`
**Archivos modificados:** `lib/booking/pricing.ts`, `app/api/booking-calendar/route.ts`,
`components/booking/calendar-day.tsx`, `components/booking/price-calendar.tsx`,
`components/BookingCalculator.tsx`, `data/properties.ts`

## 9. Nuevo modelo de precios: base para 2 huéspedes + recargo por adicional

Antes, Villa Ernesta cobraba una tarifa **fija por rango** de huéspedes (1-6, 7-12, 13-20) leída
de la tabla `rates`, y Santa Marina tenía una única tarifa plana (240.000) sin distinción de
temporada en la base de datos real (el selector de temporada del cotizador rápido era
puramente decorativo ahí). Se reemplazó por el modelo pedido:

- **Santa Marina** (solo alojamiento, capacidad real corregida a **3** huéspedes, antes decía
  4): base 2 huéspedes según temporada — baja `$200.000`/noche (antes `$240.000`), fin de
  semana `$320.000`, alta `$450.000` (estos dos últimos ya existían en el código, no se
  inventaron). El 3er huésped agrega **+$20.000/noche**, en cualquier temporada.
- **Villa Ernesta**: pasadía, base 2 huéspedes `$200.000`/día, cada huésped adicional
  **+$20.000**. Alojamiento, base 2 huéspedes `$300.000`/noche, cada huésped adicional
  **+$25.000**. Sin variación por temporada (no se pidió). Se conserva la promoción ya
  existente de 50% de descuento en la tarifa de la última noche para estadías de 3+ noches.

**Dónde vive esta fórmula (una sola fuente de verdad, en dos lenguajes que deben coincidir):**

1. `calculate_stay_price()` (función SQL nueva, en la migración) — es quien de verdad calcula
   el monto de cada reserva real, dentro de `create_public_booking()` (que también se
   reescribió: ya no depende de `rates`, suma el precio noche por noche —así una estadía en
   Santa Marina que cruce de temporada baja a fin de semana cobra cada noche a su tarifa real,
   en vez de una sola tarifa fija multiplicada, que era una inconsistencia ya presente antes
   entre la vista previa y el cobro real).
2. `getFormulaPrice()` en `lib/booking/pricing.ts` — la misma fórmula en TypeScript, para la
   vista previa del calendario y el cotizador rápido. Ambas están comentadas señalando que
   deben cambiarse juntas.

La tabla `rates` **no se borró** (no se destruye nada existente): queda como referencia
histórica, con un comentario en la propia base de datos aclarando que ya no la usan estas dos
propiedades.

## 10. Calendario: colores por temporada real (no por nivel de precio) y gris para ocupado

Antes el calendario coloreaba cada día por **tercil de precio** ($/$$/$$$, verde/amarillo/
salmón) calculado sobre las tarifas de `rates`; la "temporada" existía como dato informativo
pero no se veía. Ahora, tal como se pidió:

- 🟢 Verde = temporada baja.
- 🟠 Naranja = fin de semana (que no sea también temporada alta).
- 🔴 Rojo = temporada alta.
- ⬜ Gris = día ocupado (reservado o bloqueado) — antes se mostraba transparente con tachado;
  ahora es un gris sólido, además de mantener el tachado como refuerzo visual.

Prioridad cuando un día cae en más de una categoría: ocupado > temporada alta > fin de semana >
temporada baja (ej. un sábado dentro de la ventana de temporada alta se pinta rojo, no
naranja). La definición de "temporada" no cambió: alta = 15 dic–15 ene y 15 jun–15 ago
(vacaciones escolares y fin de año); fin de semana = viernes y sábado en la noche (así ya
estaba definido para tarifas de alojamiento en Colombia, ver `isWeekend()` en
`lib/booking/date-utils.ts`); baja = el resto. Se calcula por mes/día, así que aplica todos los
años sin tener que tocar código ni datos cada temporada.

## Archivos nuevos (2026-08-14, parte 2)

- `supabase/migrations/20260814_formula_pricing.sql`

## Archivos modificados (2026-08-14, parte 2)

- `lib/booking/pricing.ts` (reescrito: fórmula por huésped/temporada en vez de lectura de `rates`)
- `app/api/booking-calendar/route.ts`
- `components/booking/calendar-day.tsx`
- `components/booking/price-calendar.tsx`
- `components/BookingCalculator.tsx`
- `data/properties.ts` (capacidad y precio de Santa Marina; precio de Villa Ernesta)

## `npm run typecheck` y `npm run build`

✅ Ambos exitosos — 22/22 páginas. Además se validó la fórmula con 27 casos de prueba
aritméticos (ver `PRUEBAS_REALIZADAS.md`).

## 11. El huésped puede consultar y cancelar su reserva

**Archivos nuevos:** `lib/booking/lookup.ts`, `app/api/reservations/lookup/route.ts`,
`app/api/reservations/cancel/route.ts`, `components/MyBookingLookup.tsx`, `app/mi-reserva/page.tsx`
**Archivos modificados:** `lib/validation.ts`, `components/Navbar.tsx`, `components/BookingForm.tsx`

Antes, solo el panel administrativo podía ver o cambiar el estado de una reserva. Ahora, en
`/mi-reserva`, el huésped se identifica con el **código de su reserva + el correo con el que
reservó** (los mismos dos datos que ya tiene en su confirmación) y puede:

- Ver el estado de su reserva y de su pago, fechas, huéspedes, modalidad y montos.
- Cancelarla, si todavía no pasó la fecha de entrada y no estaba ya cancelada/completada.

No se agregó ninguna política RLS pública nueva sobre `bookings` (sigue siendo solo para
admins): la verificación de que el correo corresponde a esa reserva ocurre en el servidor
(`lib/booking/lookup.ts`), con el cliente admin, antes de devolver cualquier dato — así no se
puede ver una reserva ajena adivinando el código. Al cancelar, la reserva pasa a
`status='cancelled'`, lo que libera sus fechas de inmediato (la restricción de exclusión y
`check_property_availability` solo bloquean `pending`/`confirmed`).

No se automatizó ningún reembolso: la cancelación solo cambia el estado. Si el huésped ya
pagó, la página lo dirige a WhatsApp para coordinar la devolución con el propietario — no hay
todavía una política de cancelación/reembolso definida (sigue pendiente en
`PRODUCTION_SETUP.md`).

Se enlazó `/mi-reserva` desde el menú (`Navbar.tsx`) y desde la pantalla de confirmación tras
crear una reserva (`BookingForm.tsx`), recordándole al huésped guardar su código.

## 12. Aprobar/rechazar transferencias bancarias desde el panel

**Archivos modificados:** `app/api/transfers/upload/route.ts`, `app/admin/actions.ts`, `app/admin/page.tsx`

Encontré un hueco real en el flujo de pago por transferencia: cuando el huésped subía su
comprobante, el pago quedaba en `under_review` **para siempre** — no existía ningún botón en
el panel para avanzarlo. Consecuencias concretas:

- La reserva se quedaba con `payment_status='under_review'` sin importar que el dinero ya
  hubiera llegado.
- El pago nunca contaba en "Ingresos aprobados" (esa métrica solo suma `payments.status =
  'approved'`, y nada ponía nunca ese valor para transferencias).
- De paso, cada comprobante se guardaba con `amount=0` en vez del monto real (`deposit_amount`
  de la reserva) — así que aunque se hubiera podido aprobar, el ingreso habría sumado $0.

Se corrigieron ambas cosas:

- `POST /api/transfers/upload` ahora guarda el monto real (`deposit_amount` de la reserva) en
  vez de `0`.
- Nueva acción `reviewTransferPayment` con dos botones junto a cada comprobante en `/admin`:
  - **Aprobar**: marca el pago como `approved` (con `paid_at`), la reserva como
    `payment_status='paid'`, y la confirma (`status='confirmed'`) — solo si seguía `pending`,
    para no reactivar una reserva ya cancelada o completada.
  - **Rechazar**: marca el pago como `failed` y regresa la reserva a `payment_status='pending'`
    (solo si seguía `under_review`) para que el huésped pueda volver a intentar.

Comprobantes ya aprobados o rechazados muestran una etiqueta de estado en vez de los botones,
para no volver a procesarlos dos veces.

## Pasos externos pendientes (parte 2)

1. Ejecutar `supabase/migrations/20260814_formula_pricing.sql` en tu proyecto real de Supabase.
   Es el cambio más delicado de esta entrega porque reescribe la función que cobra cada
   reserva (`create_public_booking`) — no se pudo probar contra una base de datos real desde
   este entorno (ver `PRUEBAS_REALIZADAS.md`). Recomendado: probarlo primero en un proyecto de
   pruebas/staging de Supabase antes que en producción, y hacer una reserva de prueba real de
   cada propiedad/modalidad después de aplicarla.
2. Si tenías reservas de temporada alta o fin de semana ya calculadas manualmente con las
   tarifas viejas de `rates`, no se ven afectadas (son registros históricos); solo cambia el
   cálculo de reservas nuevas.
