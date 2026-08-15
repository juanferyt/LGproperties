import Image from "next/image";
import { notFound } from "next/navigation";
import { BookingCalculator } from "@/components/BookingCalculator";
import { properties } from "@/data/properties";
import { isPropertyActive } from "@/lib/property-status";

export function generateStaticParams() { return properties.map((p) => ({ slug: p.slug })); }

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = properties.find((item) => item.slug === slug);
  if (!property) notFound();
  // Propiedad desactivada desde el panel admin: se comporta como si no existiera.
  if (!(await isPropertyActive(slug))) notFound();

  return (
    <main className="min-h-screen bg-ivory">
      <section className="relative flex min-h-[82vh] items-end overflow-hidden px-6 py-20 text-white">
        <Image src={property.cover} alt={property.name} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/10" />
        <div className="relative mx-auto w-full max-w-7xl">
          <a href="/" className="text-sm text-white/75">← Volver a LG Properties</a>
          <p className="mt-20 text-xs uppercase tracking-[0.3em] text-sand">{property.location}</p>
          <h1 className="mt-5 text-6xl md:text-8xl">{property.name}</h1>
          <p className="mt-5 max-w-3xl text-2xl text-white/90">{property.tagline}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <h2 className="text-4xl">La experiencia</h2>
          <p className="mt-6 text-lg leading-8 text-black/65">{property.description}</p>
          <video controls poster={property.cover} className="mt-10 aspect-video w-full rounded-[2rem] object-cover shadow-luxury">
            <source src={property.video} type="video/mp4" />
          </video>
          <h3 className="mt-12 text-3xl">Galería</h3>
          <div className="mt-6 grid grid-cols-2 gap-4">
            {property.gallery.map((image, index) => (
              <div key={image} className={`relative overflow-hidden rounded-2xl ${index === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"}`}>
                <Image src={image} alt={`${property.name} ${index + 1}`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
            ))}
          </div>
          <h3 className="mt-12 text-3xl">Amenidades</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {property.amenities.map((amenity) => <div key={amenity} className="rounded-2xl border border-black/10 bg-white px-5 py-4">{amenity}</div>)}
          </div>
          {property.rules && (
            <div className="mt-12">
              <h3 className="text-3xl">{property.rules.title}</h3>
              <div className="mt-6 grid gap-6">
                {property.rules.sections.map((section) => (
                  <div key={section.heading} className="rounded-2xl border border-black/10 bg-white p-6">
                    <h4 className="text-xl font-semibold text-black">{section.heading}</h4>
                    <ul className="mt-3 space-y-2 text-black/65">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span aria-hidden="true">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {property.rules.note && <p className="mt-6 text-sm italic text-black/50">{property.rules.note}</p>}
            </div>
          )}
        </div>
        <aside className="h-fit lg:sticky lg:top-8"><BookingCalculator property={property.slug} /></aside>
      </section>
    </main>
  );
}
