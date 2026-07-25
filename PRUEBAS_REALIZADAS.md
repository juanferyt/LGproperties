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
