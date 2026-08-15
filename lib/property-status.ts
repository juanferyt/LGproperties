import { createAdminClient } from "@/lib/supabase/admin";
import { properties, type Property } from "@/data/properties";

/**
 * Estado real (activo/inactivo) de cada propiedad, tal como lo guarda el
 * panel administrativo en la tabla `properties.status` de Supabase.
 *
 * Si Supabase no está configurado (por ejemplo en un entorno local sin
 * `.env.local`) o la consulta falla, se asume que todas las propiedades
 * están activas: así el sitio de contenido estático sigue funcionando sin
 * romperse, igual que ya hace `lib/currency.ts` con la tasa del dólar.
 */
export async function getPropertyStatusMap(): Promise<Record<string, "active" | "inactive">> {
  try {
    const db = createAdminClient();
    const { data, error } = await db.from("properties").select("slug,status");
    if (error) throw error;
    const map: Record<string, "active" | "inactive"> = {};
    for (const row of data || []) {
      if (row.slug) map[row.slug] = row.status === "inactive" ? "inactive" : "active";
    }
    return map;
  } catch {
    return {};
  }
}

/** Filtra la lista estática de propiedades dejando fuera las desactivadas desde el panel admin. */
export async function getActiveProperties(): Promise<Property[]> {
  const status = await getPropertyStatusMap();
  return properties.filter((p) => status[p.slug] !== "inactive");
}

/** true si la propiedad fue desactivada explícitamente desde el panel admin (por defecto, activa). */
export async function isPropertyActive(slug: string): Promise<boolean> {
  const status = await getPropertyStatusMap();
  return status[slug] !== "inactive";
}
