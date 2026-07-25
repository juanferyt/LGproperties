# Puesta en producción — LG Properties 2.0

## 1. Supabase
1. Crea un proyecto.
2. Ejecuta `supabase/schema.sql` completo en SQL Editor.
3. En Authentication crea el primer usuario administrativo.
4. Copia su UUID y ejecuta la instrucción final comentada en el SQL.
5. Copia URL, anon key y service-role key en `.env.local`.
6. En Authentication > URL Configuration agrega el dominio y `/auth/update-password`.

## 2. Reglas que debes completar antes de publicar
- Check-in/check-out de Santa Marina.
- Política de cancelación y reembolso.
- Porcentaje de anticipo.
- Depósito por daños.
- Edad mínima y reglas de menores.
- Eventos y visitantes externos.
- Fechas y valores exactos de temporada alta.
- Datos bancarios reales.
- Razón social, NIT y RNT aplicables.

## 3. Wompi
- Empieza con llaves sandbox.
- Configura el webhook: `https://TU-DOMINIO/api/payments/wompi/webhook`.
- El checkout genera referencia e integridad; la confirmación final solo ocurre por webhook.
- Cambia a llaves de producción únicamente después de pruebas completas.

## 4. Correos y WhatsApp
- Verifica tu dominio en Resend y completa `RESEND_FROM_EMAIL`.
- Para WhatsApp automático completa token y Phone Number ID de Meta, o conecta n8n a los eventos de Supabase.

## 5. Airbnb iCal
La tabla `ical_feeds` ya está incluida. La sincronización automática requiere una tarea programada que lea los feeds y cree `blocked_dates`. Se dejó como módulo opcional porque necesita las URL iCal privadas de cada anuncio.

## 6. Vercel
- Sube el proyecto a GitHub.
- Importa el repositorio en Vercel.
- Añade todas las variables del `.env.example`.
- No expongas `SUPABASE_SERVICE_ROLE_KEY`, secretos Wompi ni `RESEND_API_KEY` con prefijo `NEXT_PUBLIC_`.

## 7. Legal y seguridad
Las páginas legales incluidas son plantillas. Deben ser revisadas y completadas antes de cobrar. Ejecuta pruebas de reservas simultáneas, pagos aprobados/declinados, recuperación de contraseña y permisos por rol.
