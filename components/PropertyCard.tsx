import Image from "next/image";
import Link from "next/link";
import type { Property } from "@/data/properties";

export function PropertyCard({ property }: { property: Property }) {
  return (
    <article className="group relative min-h-[620px] overflow-hidden rounded-[2rem] bg-ink text-white shadow-luxury">
      <Image src={property.cover} alt={property.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      <div className="relative flex min-h-[620px] flex-col justify-end p-8 md:p-12">
        <p className="text-xs uppercase tracking-[0.28em] text-white/70">{property.location}</p>
        <h3 className="mt-4 text-5xl md:text-6xl">{property.name}</h3>
        <p className="mt-3 text-xl text-white/90">{property.tagline}</p>
        <div className="mt-7 flex items-end justify-between gap-5">
          <div><p className="text-sm text-white/65">{property.capacity}</p><p className="mt-1 font-semibold">{property.priceFrom}</p></div>
          <Link href={`/propiedades/${property.slug}`} className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black">Descubrir</Link>
        </div>
      </div>
    </article>
  );
}
