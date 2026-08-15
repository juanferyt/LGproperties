-- NOTA (2026-08-14): este contenido ya está incluido en supabase/schema.sql.
-- Si vas a crear un proyecto de Supabase NUEVO, solo corre schema.sql — no
-- hace falta correr este archivo también. Se conserva como historial para
-- proyectos que ya existían con la versión anterior de schema.sql.
--
-- Migración: soporte para el calendario de precios y disponibilidad.
-- No destructiva: solo agrega índices para acelerar las nuevas consultas
-- que hace /api/booking-calendar (rangos de fechas por propiedad).
-- No elimina ni renombra columnas, no borra datos existentes.

create index if not exists idx_bookings_property_dates
  on public.bookings (property_id, check_in, check_out)
  where status in ('pending', 'confirmed');

create index if not exists idx_blocked_dates_property_dates
  on public.blocked_dates (property_id, start_date, end_date);

create index if not exists idx_rates_property_modality
  on public.rates (property_id, modality)
  where active;

comment on index idx_bookings_property_dates is
  'Acelera la búsqueda de noches ocupadas por propiedad para el calendario de precios.';
comment on index idx_blocked_dates_property_dates is
  'Acelera la búsqueda de fechas bloqueadas por propiedad para el calendario de precios.';
comment on index idx_rates_property_modality is
  'Acelera la selección de tarifas activas por propiedad/modalidad usada al pintar el calendario.';
