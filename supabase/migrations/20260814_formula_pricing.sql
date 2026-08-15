-- Migración: precio por fórmula (base para 2 huéspedes + recargo por huésped
-- adicional), en vez de tarifas fijas por rango de huéspedes en `rates`.
-- No destructiva: no borra la tabla `rates` ni sus filas (quedan como
-- referencia histórica, ya sin uso para calcular el precio de estas dos
-- propiedades). Solo reemplaza funciones (`create or replace`) y corrige el
-- valor de una columna existente.
--
-- Reglas de precio pedidas:
--  - Santa Marina (solo alojamiento, capacidad real: 3 huéspedes):
--      base 2 huéspedes: temporada baja 200.000 / fin de semana 320.000
--      (sin cambio, ya estaba así) / temporada alta 450.000 (sin cambio).
--      3er huésped: +20.000 por noche, en cualquier temporada.
--  - Villa Ernesta:
--      pasadía: base 2 huéspedes 200.000/día, cada huésped adicional +20.000.
--      alojamiento: base 2 huéspedes 300.000/noche, cada huésped adicional +25.000.
--      Se conserva la promoción ya existente: alojamiento de 3+ noches, 50%
--      de descuento en la tarifa de la última noche.
--
-- "Temporada" (para Santa Marina y para pintar el calendario de ambas
-- propiedades) usa la misma definición que ya existía en el código
-- (`getSeasonForDate` en lib/booking/pricing.ts, sin cambios):
--  - Alta: 15 dic–15 ene, 15 jun–15 ago (vacaciones escolares + fin de año).
--  - Fin de semana: viernes y sábado (noche), cuando no es temporada alta.
--  - Baja: el resto.
-- Estas fechas se calculan por mes/día (no por rango de fechas absolutas),
-- así que aplican automáticamente todos los años sin tener que reinsertar filas.

update public.properties set capacity = 3 where slug = 'santa-marina';

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

-- Reemplaza la función de reserva: ya no busca la tarifa en `rates` (dejaba de
-- funcionar si no había una fila que aplicara); ahora calcula el precio noche
-- a noche con calculate_stay_price(), sumando cada noche real de la estadía
-- (para que una estadía que cruce de temporada baja a alta en Santa Marina
-- cobre cada noche a su tarifa real, no una sola tarifa fija multiplicada).
-- De paso corrige un bug ya existente (no introducido aquí): en Supabase la
-- extensión pgcrypto (de la que viene gen_random_bytes, usada para generar
-- el código de la reserva) se instala en el esquema `extensions`, no en
-- `public`; como esta función fija `search_path=public`, nunca encontraba
-- gen_random_bytes y toda reserva fallaba con "function gen_random_bytes
-- does not exist". Se agrega `extensions` al search_path.
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
   -- aplica sobre la tarifa real de la ÚLTIMA noche, igual que antes.
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

comment on table public.rates is
  'Ya NO se usa para calcular el precio de santa-marina/villa-ernesta (ver '
  'calculate_stay_price(), migración 20260814). Se conserva sin borrar por si '
  'se agregan propiedades nuevas con tarifas manuales en el futuro.';
