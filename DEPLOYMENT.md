# Guía de publicación

## 1. Repositorio
Sube la carpeta a GitHub sin incluir `.env.local`.

## 2. Supabase
Crea un proyecto, abre SQL Editor y ejecuta `supabase/schema.sql`.

## 3. Vercel
Importa el repositorio, agrega las variables de `.env.example` y despliega.

## 4. Pagos reales
Crea una cuenta de comercio Wompi y agrega sus llaves. Nunca expongas la llave privada en componentes del navegador.

## 5. Correo
Configura Resend, verifica el dominio y usa los correos de cada propiedad como destinatarios administrativos.

## 6. Seguridad antes de producción
- Activar login para `/admin`.
- Implementar políticas RLS en Supabase.
- Validar disponibilidad en servidor antes de confirmar.
- Verificar webhooks de Wompi.
- Añadir políticas, términos, privacidad y cancelación.
- Configurar backups y analítica.
