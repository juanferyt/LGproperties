# Instrucciones de despliegue — Calendario de precios LG Properties

## 1. SQL que debes ejecutar

En el SQL Editor de tu proyecto Supabase, en este orden:

1. `supabase/schema.sql` — solo si es un proyecto nuevo (ya incluye `properties`, `rates`,
   `bookings`, `blocked_dates`, `discounts`, `payments`, funciones y políticas RLS).
   Si tu proyecto ya está en producción y ya ejecutaste este archivo antes, **no lo vuelvas a
   correr completo**: usa `on conflict do nothing` para los datos semilla, así que re-ejecutarlo
   no borra reservas existentes, pero sí fallaría en los `create type` si los tipos ya existen.
2. `supabase/migrations/20260723_price_calendar.sql` — agrega únicamente índices
   para acelerar las consultas del calendario. No borra ni modifica datos existentes.
3. `supabase/migrations/20260724_settings_table.sql` — **nuevo en esta revisión**. Crea la
   tabla `settings` (clave/valor) que ya usaban `app/api/settings`, el panel administrativo
   (tasa USD/COP) y `lib/currency.ts`, pero que nunca se había creado. Sin ejecutar esta
   migración, el selector de "Tasa del dólar" del panel administrativo no guarda nada (falla
   en silencio). No destructiva (`if not exists`).

No se agregó ninguna tabla para el calendario en sí: sigue usando `rates`, `bookings` y
`blocked_dates` tal como ya existían. Solo `settings` es tabla nueva, y es para la función de
tasa de cambio del panel admin, no para el calendario de precios.

## 2. Variables de entorno en Vercel

Copia `.env.example`, complétalo con tus valores reales y agrégalo como variables de entorno
del proyecto en Vercel (Settings → Environment Variables):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (nunca la expongas en el cliente; solo se usa en Route Handlers)
- `NEXT_PUBLIC_SITE_URL` (la URL pública final, ej. `https://lgproperties.com`)
- `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, `WOMPI_BASE_URL`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_NOTIFICATION_EMAIL`
- `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID` (opcional, envío automático de WhatsApp)
- `CRON_SECRET` (protege `/api/cron/ical-sync`)
- Datos bancarios (`BANK_NAME`, `BANK_ACCOUNT_TYPE`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_HOLDER`,
  `BANK_ACCOUNT_DOCUMENT`): **ya están conectados** al botón "Pagar con transferencia" que
  aparece tras crear una reserva (`/api/transfers/details` los lee y los muestra al huésped).
  Complétalos con tus datos bancarios reales.

## 3. Cómo desplegar

1. Sube este proyecto a un repositorio de GitHub (sin `node_modules`, `.next` ni `.env.local`;
   ya vienen excluidos por `.gitignore`).
2. Importa el repositorio en Vercel.
3. Agrega las variables de entorno del paso 2.
4. Despliega. Vercel ejecuta `next build` automáticamente.

## 4. URL a configurar en Supabase Authentication

En Authentication → URL Configuration, agrega:

- Site URL: tu dominio final, ej. `https://lgproperties.com`
- Redirect URLs: `https://lgproperties.com/auth/update-password`

## 5. Cómo comprobar que el calendario funciona

1. Abre `/reservar`.
2. Elige una propiedad y una modalidad. Pulsa "Abrir calendario".
3. Debes ver dos meses con días en verde/amarillo/salmón pastel según la tarifa real
   configurada en la tabla `rates` de esa propiedad.
4. Haz clic en una fecha (check-in) y luego en otra posterior (check-out): deben verse en
   negro/borde negro y el rango intermedio resaltado.
5. La tarjeta inferior debe mostrar noches, precio y total, y el botón "Continuar" debe
   guardar las fechas en el formulario.
6. Intenta seleccionar un rango que incluya una fecha ya reservada o bloqueada: debe
   mostrarse un mensaje y no permitir ese rango.
7. Completa el formulario y confirma una reserva: la base de datos (función
   `create_public_booking` + restricción `exclude` en `bookings`) sigue siendo la que valida
   y evita reservas duplicadas, exactamente igual que antes de este cambio.

## 6. Corrección importante: pago con Wompi (error 403 de CloudFront)

Si te salió un error 403 de CloudFront al hacer clic en "Pagar ahora con Wompi", era porque
el checkout se armaba con el parámetro `signature` en vez de `signature:integrity` (el nombre
exacto que exige Wompi para el checkout alojado). Ya está corregido en
`app/api/payments/wompi/checkout/route.ts`. Después de desplegar esta versión, vuelve a
probar el botón de Wompi.

## 7. Corrección importante: el calendario ya no inventa precios

En una versión intermedia de este proyecto se agregó lógica que **multiplicaba** la tarifa
real por 1.35x en "temporada alta" y 1.2x en fines de semana (fechas de diciembre, enero,
junio-agosto codificadas directamente en el código, no en Supabase). Esto violaba la regla
de "nunca inventar precios" y además no coincidía con el total que realmente cobra el backend
al crear la reserva (que sí usa la tarifa real de `rates`), generando una diferencia entre lo
que veía el huésped en el calendario y lo que se registraba al reservar.

Se corrigió para que el calendario use siempre el monto real de `rates`, y los niveles
$/$$/$$$ vuelvan a calcularse por terciles de las tarifas reales de cada propiedad (no por
temporada). Si en algún momento quieres precios distintos en fin de semana o en fechas
específicas, ya es posible y correcto hacerlo agregando filas a la tabla `rates` con
`weekend_only = true` o con `start_date`/`end_date`, sin tocar código.

## 8. Pruebas adicionales para las funciones agregadas desde la última entrega

- **Transferencia bancaria**: en `/reservar`, crea una reserva y pulsa "Pagar con
  transferencia". Deben aparecer tus datos bancarios reales y un botón para subir el
  comprobante (JPG/PNG/PDF, máx. 8 MB). Verifica en el panel admin que el comprobante quede
  visible como enlace "Ver comprobante".
- **Tasa del dólar en el panel admin**: entra a `/admin`, cambia la "Tasa del dólar" y guarda.
  Recarga la página: el valor debe mantenerse (requiere haber ejecutado la migración del
  punto 1.3).
- **Precios en USD**: en el calendario y en la cotización rápida de cada propiedad, el precio
  en COP debe ir acompañado del equivalente en USD, calculado con la tasa configurada.

## Nota sobre el total mostrado en el calendario

El calendario suma el precio real de cada noche (tomado de `rates`) para mostrarte un
estimado antes de reservar. El total definitivo y vinculante siempre lo calcula el backend
(la función `create_public_booking` en Supabase) en el momento de crear la reserva; eso no
cambió con esta actualización.
