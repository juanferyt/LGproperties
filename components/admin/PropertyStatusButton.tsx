"use client";

// Botón de envío del formulario de activar/desactivar propiedad. Al desactivar
// (acción que oculta la propiedad del sitio público de inmediato) pide
// confirmación para evitar un clic accidental; al activar no interrumpe.
export function PropertyStatusButton({ active, propertyName }: { active: boolean; propertyName: string }) {
  return (
    <button
      className={`rounded-full px-4 py-3 text-sm font-semibold text-white ${active ? "bg-red-600" : "bg-forest"}`}
      onClick={(e) => {
        if (active && !confirm(`¿Desactivar "${propertyName}"? Dejará de verse en el sitio y no se podrán crear nuevas reservas hasta que la reactives.`)) {
          e.preventDefault();
        }
      }}
    >
      {active ? "Desactivar" : "Activar"}
    </button>
  );
}
