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
