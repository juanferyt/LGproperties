-- LG Properties 2.0 — ejecutar completo en el SQL Editor de un proyecto de
-- Supabase NUEVO Y VACÍO. Este archivo ya incluye todo lo que antes estaba
-- repartido en supabase/migrations/ (calendario de precios, tabla settings,
-- precios por fórmula/temporada) — así que en un proyecto nuevo NO hace
-- falta correr también los archivos de migrations/: quedan ahí solo como
-- historial de cómo llegó el esquema a este estado, para proyectos que ya
-- existían antes de esta versión.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.user_role as enum ('superadmin','admin','reception');
create type public.booking_status as enum ('pending','confirmed','cancelled','completed');
create type public.payment_status as enum ('pending','under_review','paid','failed','refunded');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text, role public.user_role not null default 'reception', active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.properties (
 id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null, location text,
 description text, capacity int not null default 1, bedrooms int default 0, bathrooms int default 0,
 status text not null default 'active', check_in_time time, check_out_time time,
 deposit_percentage numeric(5,2) not null default 50, damage_deposit numeric(12,2) default 0,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.customers (
 id uuid primary key default gen_random_uuid(), full_name text not null, email text not null, phone text not null,
 document text, created_at timestamptz default now(), unique(email,phone)
);
-- Tabla de tarifas manuales por rango de huéspedes. Ya NO la usan
-- santa-marina ni villa-ernesta para calcular su precio (ver
-- calculate_stay_price() más abajo, que calcula por fórmula: base para 2
-- huéspedes + recargo por adicional, con temporada real para Santa Marina).
-- Se conserva por si en el futuro se agrega una propiedad nueva con tarifas
-- manuales por rango en vez de fórmula.
create table public.rates (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties on delete cascade,
 name text not null, modality text not null check(modality in ('accommodation','day_pass')), min_guests int default 1,
 max_guests int not null, amount numeric(12,2) not null, start_date date, end_date date,
 weekend_only boolean default false, active boolean default true, created_at timestamptz default now()
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(), code text unique not null,
 property_id uuid not null references public.properties, customer_id uuid not null references public.customers,
 check_in date not null, check_out date not null, adults int not null, children int not null default 0,
 modality text not null check(modality in ('accommodation','day_pass')), notes text,
 status public.booking_status not null default 'pending', payment_status public.payment_status not null default 'pending',
 total_amount numeric(12,2) not null, deposit_amount numeric(12,2) not null,
 source text default 'website', created_at timestamptz default now(), updated_at timestamptz default now(),
 constraint valid_dates check(check_out > check_in)
);
-- Impide solapamientos para reservas activas de alojamiento.
alter table public.bookings add constraint no_overlapping_active_bookings exclude using gist (
 property_id with =, daterange(check_in,check_out,'[)') with &&
) where (status in ('pending','confirmed') and modality='accommodation');

create table public.blocked_dates (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties on delete cascade,
 start_date date not null, end_date date not null, reason text, block_type text default 'maintenance', created_by uuid references auth.users,
 created_at timestamptz default now(), constraint valid_block_dates check(end_date > start_date)
);
create table public.payments (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings on delete cascade,
 reference text unique not null, provider_id text, amount numeric(12,2) not null, method text not null,
 status text not null default 'pending', proof_path text, provider_payload jsonb, paid_at timestamptz, created_at timestamptz default now()
);
create table public.discounts (
 id uuid primary key default gen_random_uuid(), code text unique, property_id uuid references public.properties,
 percentage numeric(5,2), fixed_amount numeric(12,2), start_date date, end_date date, max_uses int, used_count int default 0, active boolean default true
);
create table public.audit_logs (
 id bigint generated always as identity primary key, user_id uuid references auth.users, action text not null,
 entity text, entity_id text, details jsonb, created_at timestamptz default now()
);
create table public.ical_feeds (
 id uuid primary key default gen_random_uuid(), property_id uuid references public.properties on delete cascade,
 provider text default 'airbnb', url text not null, active boolean default true, last_sync_at timestamptz
);
-- Configuración simple clave/valor editable desde el panel administrativo
-- (ej. tasa USD/COP para mostrar precios en dólares).
create table public.settings (
 key text primary key, value text not null, updated_at timestamptz default now()
);

-- Índices para el calendario de precios y disponibilidad (/api/booking-calendar).
create index idx_bookings_property_dates
  on public.bookings (property_id, check_in, check_out)
  where status in ('pending', 'confirmed');
create index idx_blocked_dates_property_dates
  on public.blocked_dates (property_id, start_date, end_date);
create index idx_rates_property_modality
  on public.rates (property_id, modality)
  where active;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and active and role in ('superadmin','admin','reception'));
$$;
create or replace function public.check_property_availability(p_property_id uuid,p_check_in date,p_check_out date)
returns boolean language sql stable security definer set search_path=public as $$
 select not exists(select 1 from bookings where property_id=p_property_id and status in ('pending','confirmed') and modality='accommodation' and daterange(check_in,check_out,'[)') && daterange(p_check_in,p_check_out,'[)'))
 and not exists(select 1 from blocked_dates where property_id=p_property_id and daterange(start_date,end_date,'[)') && daterange(p_check_in,p_check_out,'[)'));
$$;

-- Fuente única de verdad del precio por noche (alojamiento) o por día
-- (pasadía). Debe reflejar exactamente la misma fórmula que
-- getFormulaPrice()/getSeasonForDate() en lib/booking/pricing.ts (usado
-- para la vista previa del calendario): si cambias un número aquí,
-- cámbialo también allá, y viceversa. Devuelve null si la propiedad o la
-- modalidad no existen/no aplican (ej. pasadía en Santa Marina).
--
-- Reglas:
--  - Santa Marina (solo alojamiento, capacidad 3): base 2 huéspedes según
--    temporada (baja 200.000 / fin de semana 320.000 / alta 450.000),
--    +20.000 por el 3er huésped.
--  - Villa Ernesta: pasadía, base 2 huéspedes 200.000/día, +20.000 por cada
--    huésped adicional. Alojamiento, base 2 huéspedes 300.000/noche,
--    +25.000 por cada huésped adicional. No varía por temporada.
-- "Temporada": alta = 15 dic–15 ene y 15 jun–15 ago (vacaciones escolares +
-- fin de año); fin de semana = viernes y sábado en la noche; baja = el
-- resto. Se calcula por mes/día (no por rango de fechas absolutas), así que
-- aplica automáticamente todos los años.
create or replace function public.calculate_stay_price(
  p_property_slug text,
  p_modality text,
  p_guests int,
  p_date date
) returns numeric
language plpgsql
immutable
as $$
declare
  v_month int := extract(month from p_date)::int;
  v_day int := extract(day from p_date)::int;
  v_dow int := extract(dow from p_date)::int; -- 0=domingo … 5=viernes, 6=sábado
  v_is_weekend boolean := v_dow in (5,6);
  v_is_high boolean := (v_month=12 and v_day>=15) or (v_month=1 and v_day<=15)
                     or (v_month=6 and v_day>=15) or v_month=7 or (v_month=8 and v_day<=15);
  v_extra numeric;
begin
  if p_property_slug = 'santa-marina' then
    if p_modality <> 'accommodation' then return null; end if;
    v_extra := greatest(0, p_guests - 2) * 20000;
    if v_is_high then return 450000 + v_extra;
    elsif v_is_weekend then return 320000 + v_extra;
    else return 200000 + v_extra;
    end if;
  elsif p_property_slug = 'villa-ernesta' then
    if p_modality = 'day_pass' then
      v_extra := greatest(0, p_guests - 2) * 20000;
      return 200000 + v_extra;
    elsif p_modality = 'accommodation' then
      v_extra := greatest(0, p_guests - 2) * 25000;
      return 300000 + v_extra;
    else
      return null;
    end if;
  else
    return null;
  end if;
end;
$$;

comment on function public.calculate_stay_price(text, text, int, date) is
  'Fuente única de verdad del precio por noche (alojamiento) o por día (pasadía). '
  'Debe reflejar exactamente la misma fórmula que getFormulaPrice()/getSeasonForDate() '
  'en lib/booking/pricing.ts (usado para la vista previa del calendario): si cambias '
  'un número aquí, cámbialo también allá, y viceversa. Devuelve null si la propiedad '
  'o la modalidad no existen/no aplican (ej. pasadía en Santa Marina).';

-- Crea la reserva de forma transaccional: valida disponibilidad, capacidad,
-- calcula el total noche por noche con calculate_stay_price() (así una
-- estadía que cruce de temporada en Santa Marina cobra cada noche a su
-- tarifa real, no una tarifa fija multiplicada), aplica el descuento de la
-- última noche en Villa Ernesta para estadías de 3+ noches, crea/actualiza
-- el cliente y registra la reserva. La restricción de exclusión en
-- `bookings` es la última línea de defensa contra doble reserva.
create or replace function public.create_public_booking(
 p_property_id uuid,p_full_name text,p_email text,p_phone text,p_document text,p_check_in date,p_check_out date,
 p_adults int,p_children int,p_modality text,p_notes text,p_payment_option text
) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare
  v_customer uuid; v_property properties%rowtype; v_nights int; v_total numeric;
  v_deposit numeric; v_code text; v_booking uuid; v_guests int; v_last_night_price numeric;
begin
 if p_modality='accommodation' and not check_property_availability(p_property_id,p_check_in,p_check_out) then raise exception 'NO_AVAILABLE'; end if;
 select * into v_property from properties where id=p_property_id and status='active'; if not found then raise exception 'PROPERTY_NOT_FOUND'; end if;
 v_guests := p_adults+p_children;
 if v_guests > v_property.capacity then raise exception 'CAPACITY_EXCEEDED'; end if;
 v_nights := greatest(1,p_check_out-p_check_in);

 if p_modality='accommodation' then
   select coalesce(sum(public.calculate_stay_price(v_property.slug,p_modality,v_guests,d::date)),0)
   into v_total
   from generate_series(p_check_in::timestamp, (p_check_out-1)::timestamp, interval '1 day') as d;
   if v_total=0 then raise exception 'RATE_NOT_CONFIGURED'; end if;
   -- Villa Ernesta: tercera noche (o más) al 50% cuando hay 3+ noches — se
   -- aplica sobre la tarifa real de la ÚLTIMA noche.
   if v_property.slug='villa-ernesta' and v_nights>=3 then
     v_last_night_price := public.calculate_stay_price(v_property.slug,p_modality,v_guests,(p_check_out-1));
     v_total := v_total - (v_last_night_price*0.5);
   end if;
 else
   v_total := public.calculate_stay_price(v_property.slug,p_modality,v_guests,p_check_in);
   if v_total is null then raise exception 'RATE_NOT_CONFIGURED'; end if;
 end if;

 v_deposit=case when p_payment_option='full' then v_total else round(v_total*(v_property.deposit_percentage/100),0) end;
 insert into customers(full_name,email,phone,document) values(p_full_name,lower(p_email),p_phone,p_document) on conflict(email,phone) do update set full_name=excluded.full_name,document=excluded.document returning id into v_customer;
 v_code='LGP-'||to_char(now(),'YYMMDD')||'-'||upper(substr(encode(gen_random_bytes(4),'hex'),1,6));
 insert into bookings(code,property_id,customer_id,check_in,check_out,adults,children,modality,notes,total_amount,deposit_amount) values(v_code,p_property_id,v_customer,p_check_in,p_check_out,p_adults,p_children,p_modality,p_notes,v_total,v_deposit) returning id into v_booking;
 return jsonb_build_object('id',v_booking,'code',v_code,'property_name',v_property.name,'total_amount',v_total,'deposit_amount',v_deposit);
exception when exclusion_violation then raise exception 'NO_AVAILABLE'; end; $$;

alter table profiles enable row level security; alter table properties enable row level security; alter table customers enable row level security;
alter table rates enable row level security; alter table bookings enable row level security; alter table blocked_dates enable row level security;
alter table payments enable row level security; alter table discounts enable row level security; alter table audit_logs enable row level security; alter table ical_feeds enable row level security;
alter table settings enable row level security;
create policy "public read active properties" on properties for select using(status='active');
create policy "public read active rates" on rates for select using(active);
create policy "public read settings" on settings for select using(true);
create policy "admins profiles" on profiles for all using(is_admin()) with check(is_admin());
create policy "admins properties" on properties for all using(is_admin()) with check(is_admin());
create policy "admins customers" on customers for all using(is_admin()) with check(is_admin());
create policy "admins rates" on rates for all using(is_admin()) with check(is_admin());
create policy "admins bookings" on bookings for all using(is_admin()) with check(is_admin());
create policy "admins blocked dates" on blocked_dates for all using(is_admin()) with check(is_admin());
create policy "admins payments" on payments for all using(is_admin()) with check(is_admin());
create policy "admins discounts" on discounts for all using(is_admin()) with check(is_admin());
create policy "admins audit" on audit_logs for select using(is_admin());
create policy "admins feeds" on ical_feeds for all using(is_admin()) with check(is_admin());
create policy "admins settings" on settings for all using(is_admin()) with check(is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('payment-proofs','payment-proofs',false,8000000,array['image/jpeg','image/png','application/pdf']) on conflict(id) do nothing;
create policy "admins view payment proofs" on storage.objects for select using(bucket_id='payment-proofs' and public.is_admin());

insert into properties(name,slug,location,capacity,bedrooms,bathrooms,deposit_percentage) values
('Santa Marina','santa-marina','Santa Marta, Colombia',3,1,1,50),
('Villa Ernesta','villa-ernesta','Yuto, Chocó, Colombia',20,4,6,50)
on conflict(slug) do nothing;

insert into settings(key,value) values ('usd_to_cop_rate','4200') on conflict(key) do nothing;

-- Tras crear el primer usuario en Authentication, conviértelo en superadmin:
-- insert into profiles(id,full_name,role) values('UUID_DEL_USUARIO','Administrador LG','superadmin');
