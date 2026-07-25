export type Property = {
  slug: "santa-marina" | "villa-ernesta";
  name: string; location: string; tagline: string; description: string;
  capacity: string; priceFrom: string; accent: "ocean" | "forest";
  amenities: string[]; cover: string; video: string; gallery: string[];
};

export const properties: Property[] = [
  {
    slug: "santa-marina", name: "Santa Marina", location: "Santa Marta, Colombia",
    tagline: "Despierta frente al Caribe.",
    description: "Apartamento tipo estudio para máximo 4 huéspedes, con balcón, vista al mar, piscinas y acceso a playa privada.",
    capacity: "Máximo 4 huéspedes", priceFrom: "$240.000 COP / noche", accent: "ocean",
    cover: "/media/santa-marina/DDDFF2E0-1366-46F1-B822-163B74EA1FF5.jpeg", video: "/media/santa-marina/tour.mp4",
    gallery: [
      "/media/santa-marina/7A90CD73-1715-4564-9346-C8D448011DF0.jpeg",
      "/media/santa-marina/3C4A0220-DD6A-42CF-ADE4-06907F8D804B.jpeg",
      "/media/santa-marina/9F9FCE4C-A0C9-4A63-9717-2B58DA8E15D8.jpeg",
      "/media/santa-marina/D0A335F0-FE81-4F4E-A8E4-73A270CE61FD.jpeg",
      "/media/santa-marina/676F3F2B-1DDC-4140-A44C-E66CF4F69060.jpeg"
    ],
    amenities: ["Vista al mar", "Playa privada", "Piscinas", "WiFi", "Aire acondicionado", "Cocina equipada", "Smart TV", "Balcón", "No admite mascotas"]
  },
  {
    slug: "villa-ernesta", name: "Villa Ernesta", location: "Yuto, Chocó, Colombia",
    tagline: "Reconecta con la naturaleza.",
    description: "Casa campestre con 4 habitaciones, 6 baños, zona social, bar, piscina infantil tipo jacuzzi y la quebrada Doña Josefa a unos 10 metros.",
    capacity: "Hasta 20 huéspedes", priceFrom: "$300.000 COP / pasadía", accent: "forest",
    cover: "/media/villa-ernesta/cover.jpg", video: "/media/villa-ernesta/tour.mp4",
    gallery: ["/media/villa-ernesta/frame-1.jpg", "/media/villa-ernesta/frame-2.jpg", "/media/villa-ernesta/frame-3.jpg"],
    amenities: ["4 habitaciones", "6 baños", "Sala y comedor", "Cocina", "Zona social", "Bar", "Piscina infantil tipo jacuzzi", "Hamacas", "Columpios", "Quebrada cercana"]
  }
];
