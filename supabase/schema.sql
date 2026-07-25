-- LG Properties 2.0 — ejecutar completo en Supabase SQL Editor
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

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and active and role in ('superadmin','admin','reception'));
$$;
create or replace function public.check_property_availability(p_property_id uuid,p_check_in date,p_check_out date)
returns boolean language sql stable security definer set search_path=public as $$
 select not exists(select 1 from bookings where property_id=p_property_id and status in ('pending','confirmed') and modality='accommodation' and daterange(check_in,check_out,'[)') && daterange(p_check_in,p_check_out,'[)'))
 and not exists(select 1 from blocked_dates where property_id=p_property_id and daterange(start_date,end_date,'[)') && daterange(p_check_in,p_check_out,'[)'));
$$;
create or replace function public.create_public_booking(
 p_property_id uuid,p_full_name text,p_email text,p_phone text,p_document text,p_check_in date,p_check_out date,
 p_adults int,p_children int,p_modality text,p_notes text,p_payment_option text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_customer uuid; v_property properties%rowtype; v_rate rates%rowtype; v_nights int; v_total numeric; v_deposit numeric; v_code text; v_booking uuid;
begin
 if p_modality='accommodation' and not check_property_availability(p_property_id,p_check_in,p_check_out) then raise exception 'NO_AVAILABLE'; end if;
 select * into v_property from properties where id=p_property_id and status='active'; if not found then raise exception 'PROPERTY_NOT_FOUND'; end if;
 if p_adults+p_children > v_property.capacity then raise exception 'CAPACITY_EXCEEDED'; end if;
 select * into v_rate from rates where property_id=p_property_id and active and modality=p_modality and p_adults+p_children between min_guests and max_guests and (start_date is null or p_check_in>=start_date) and (end_date is null or p_check_in<=end_date) order by start_date desc nulls last limit 1;
 if not found then raise exception 'RATE_NOT_CONFIGURED'; end if;
 v_nights=greatest(1,p_check_out-p_check_in); v_total=v_rate.amount*(case when p_modality='accommodation' then v_nights else 1 end);
 -- Villa Ernesta: tercera noche al 50% cuando hay 3+ noches.
 if v_property.slug='villa-ernesta' and p_modality='accommodation' and v_nights>=3 then v_total=v_total-(v_rate.amount*0.5); end if;
 v_deposit=case when p_payment_option='full' then v_total else round(v_total*(v_property.deposit_percentage/100),0) end;
 insert into customers(full_name,email,phone,document) values(p_full_name,lower(p_email),p_phone,p_document) on conflict(email,phone) do update set full_name=excluded.full_name,document=excluded.document returning id into v_customer;
 v_code='LGP-'||to_char(now(),'YYMMDD')||'-'||upper(substr(encode(gen_random_bytes(4),'hex'),1,6));
 insert into bookings(code,property_id,customer_id,check_in,check_out,adults,children,modality,notes,total_amount,deposit_amount) values(v_code,p_property_id,v_customer,p_check_in,p_check_out,p_adults,p_children,p_modality,p_notes,v_total,v_deposit) returning id into v_booking;
 return jsonb_build_object('id',v_booking,'code',v_code,'property_name',v_property.name,'total_amount',v_total,'deposit_amount',v_deposit);
exception when exclusion_violation then raise exception 'NO_AVAILABLE'; end; $$;

alter table profiles enable row level security; alter table properties enable row level security; alter table customers enable row level security;
alter table rates enable row level security; alter table bookings enable row level security; alter table blocked_dates enable row level security;
alter table payments enable row level security; alter table discounts enable row level security; alter table audit_logs enable row level security; alter table ical_feeds enable row level security;
create policy "public read active properties" on properties for select using(status='active');
create policy "public read active rates" on rates for select using(active);
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

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('payment-proofs','payment-proofs',false,8000000,array['image/jpeg','image/png','application/pdf']) on conflict(id) do nothing;
create policy "admins view payment proofs" on storage.objects for select using(bucket_id='payment-proofs' and public.is_admin());

insert into properties(name,slug,location,capacity,bedrooms,bathrooms,deposit_percentage) values
('Santa Marina','santa-marina','Santa Marta, Colombia',4,1,1,50),
('Villa Ernesta','villa-ernesta','Yuto, Chocó, Colombia',20,4,6,50)
on conflict(slug) do nothing;
insert into rates(property_id,name,modality,min_guests,max_guests,amount)
select id,'Temporada baja','accommodation',1,4,240000 from properties where slug='santa-marina'
union all select id,'1 a 6 alojamiento','accommodation',1,6,380000 from properties where slug='villa-ernesta'
union all select id,'7 a 12 alojamiento','accommodation',7,12,480000 from properties where slug='villa-ernesta'
union all select id,'13 a 20 alojamiento','accommodation',13,20,580000 from properties where slug='villa-ernesta'
union all select id,'1 a 6 pasadía','day_pass',1,6,300000 from properties where slug='villa-ernesta'
union all select id,'7 a 12 pasadía','day_pass',7,12,380000 from properties where slug='villa-ernesta'
union all select id,'13 a 20 pasadía','day_pass',13,20,480000 from properties where slug='villa-ernesta';

-- Tras crear el primer usuario en Authentication, conviértelo en superadmin:
-- insert into profiles(id,full_name,role) values('UUID_DEL_USUARIO','Administrador LG','superadmin');
