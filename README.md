# LG Properties 2.0 — Base de producción

Esta versión sustituye el almacenamiento del navegador por Supabase e incorpora:

- PostgreSQL real para propiedades, clientes, reservas, tarifas, bloqueos, pagos y usuarios.
- Prevención de doble reserva en la propia base de datos.
- Supabase Auth con login, sesiones SSR, recuperación de contraseña y panel protegido.
- RLS y roles administrativos.
- API de disponibilidad y creación transaccional de reservas.
- Wompi Checkout + webhook verificado para estados de pago.
- Transferencias con carga privada de comprobantes.
- Correos con Resend y conexión opcional a WhatsApp Cloud API.
- Panel administrativo conectado a Supabase.
- Estructura para descuentos, auditoría e iCal de Airbnb.
- Plantillas legales y guía de despliegue.

## Ejecutar

En PowerShell, para evitar el bloqueo de `npm.ps1`:

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Después abre `http://localhost:3000`.

## Importante
El código está preparado, pero los pagos, correos, WhatsApp, dominio y base de datos solo operan al introducir credenciales reales. Lee `PRODUCTION_SETUP.md` antes de publicar.
