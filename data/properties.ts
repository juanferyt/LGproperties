export type PropertyRules = {
  title: string;
  sections: { heading: string; items: string[] }[];
  note?: string;
};

export type Property = {
  slug: "santa-marina" | "villa-ernesta";
  name: string; location: string; tagline: string; description: string;
  capacity: string; priceFrom: string; accent: "ocean" | "forest";
  amenities: string[]; cover: string; video: string; gallery: string[];
  rules?: PropertyRules;
};

export const properties: Property[] = [
  {
    slug: "santa-marina", name: "Santa Marina", location: "Santa Marta, Colombia",
    tagline: "Despierta frente al Caribe.",
    description: "Apartamento tipo estudio para máximo 3 huéspedes, con balcón, vista al mar, piscinas y acceso a playa privada.",
    capacity: "Máximo 3 huéspedes", priceFrom: "$200.000 COP / noche", accent: "ocean",
    cover: "/media/santa-marina/DDDFF2E0-1366-46F1-B822-163B74EA1FF5.jpeg", video: "/media/santa-marina/tour.mp4",
    gallery: [
      "/media/santa-marina/7A90CD73-1715-4564-9346-C8D448011DF0.jpeg",
      "/media/santa-marina/3C4A0220-DD6A-42CF-ADE4-06907F8D804B.jpeg",
      "/media/santa-marina/9F9FCE4C-A0C9-4A63-9717-2B58DA8E15D8.jpeg",
      "/media/santa-marina/D0A335F0-FE81-4F4E-A8E4-73A270CE61FD.jpeg",
      "/media/santa-marina/676F3F2B-1DDC-4140-A44C-E66CF4F69060.jpeg"
    ],
    amenities: ["Vista al mar", "Playa privada", "Piscinas", "WiFi", "Aire acondicionado", "Cocina equipada", "Smart TV", "Balcón", "No admite mascotas"],
    rules: {
      title: "Reglamento del conjunto Santa Marina",
      sections: [
        {
          heading: "Ingreso al conjunto",
          items: [
            "Horario de atención 6:00 a.m. a 8:00 p.m. Luego del cierre, el ingreso es por garita.",
            "Contacto de recepción: 312 301 4977.",
            "Es obligatorio el porte de las manillas de identificación.",
            "Todos los propietarios, residentes, invitados y huéspedes deberán realizar su registro al ingreso.",
            "Hacer buen uso de las zonas comunes y del mobiliario del lobby.",
            "Se debe portar ropa adecuada y evitar estar sin camisa mientras se circula por el lobby.",
            "No se admiten visitas de huéspedes en los apartamentos; deberán recibirlas en el lobby del conjunto.",
            "Los parqueaderos provisionales se utilizan de manera aleatoria y por ocupación.",
            "No arrojar por los shut de basuras elementos cortopunzantes ni botellas de vidrio.",
            "En todas las zonas comunes y apartamentos se deben mantener los dispositivos de sonido en decibeles normales.",
            "No colgar ropa en balcones, ventanas ni barandas.",
            "No se admite el ingreso de conjuntos musicales."
          ]
        },
        {
          heading: "Zonas comunes, piscinas y jacuzzis",
          items: [
            "Horario de piscinas y jacuzzis: 9:00 a.m. a 7:50 p.m. Cerradas cada quince días, los martes, por mantenimiento general.",
            "Cumplir el reglamento de las piscinas y jacuzzis.",
            "No está permitido el uso de dispositivos de sonido (bafles), ya que afectan la tranquilidad de los usuarios.",
            "No está permitido el consumo de alimentos ni bebidas alcohólicas en las piscinas.",
            "No se permite el ingreso de envases de vidrio.",
            "Los menores de 12 años siempre deben estar en compañía de un adulto.",
            "Prohibido el ingreso de mascotas a las zonas húmedas."
          ]
        },
        {
          heading: "Restaurante",
          items: ["El horario del restaurante es de 8:00 a.m. a 8:00 p.m."]
        },
        {
          heading: "Ascensores",
          items: [
            "El conjunto cuenta con 3 ascensores en torre 1 y torre 2.",
            "No ingresar mojado a los ascensores.",
            "No exceder la capacidad de los equipos.",
            "No saltar dentro de los ascensores.",
            "No arrojar basura en el interior de los ascensores.",
            "Oprimir solo el botón del piso al cual se dirige."
          ]
        },
        {
          heading: "Lavandería",
          items: [
            "Horario: lunes a sábado de 7:00 a.m. a 8:00 p.m.; domingos y festivos de 10:00 a.m. a 6:00 p.m.",
            "Autoservicio.",
            "Valor de cada ciclo: lavado $15.000 y secado $15.000.",
            "Se debe ingresar el valor completo, ya que las máquinas no devuelven dinero.",
            "No dejar ropa en los equipos sin supervisión.",
            "El lavado y secado es responsabilidad del usuario; la administración no se hace responsable por daños ocasionados en las prendas."
          ]
        },
        {
          heading: "Sillas y asoleadoras",
          items: [
            "No se permite reservar dejando elementos encima de ellas sin uso por más de 10 minutos.",
            "Al terminar de usar la zona de piscinas y jacuzzis, se debe dejar limpia y organizada."
          ]
        },
        {
          heading: "Mascotas",
          items: [
            "No se permite la circulación de mascotas en las áreas comunes sin collar y bozal.",
            "No se permite usar las áreas comunes para bañarlas o peinarlas.",
            "Recoger y limpiar orines y heces de las mascotas.",
            "Prohibido el ingreso de mascotas a las zonas de piscinas y jacuzzis."
          ]
        }
      ],
      note: "Agradecemos su colaboración y atención a estas recomendaciones; el no cumplimiento podría traer llamados de atención y sanciones, conforme al reglamento de propiedad horizontal (Ley 675)."
    }
  },
  {
    slug: "villa-ernesta", name: "Villa Ernesta", location: "Yuto, Chocó, Colombia",
    tagline: "Reconecta con la naturaleza.",
    description: "Casa campestre con 4 habitaciones, 6 baños, zona social, bar, piscina infantil tipo jacuzzi y la quebrada Doña Josefa a unos 10 metros.",
    capacity: "Hasta 20 huéspedes", priceFrom: "$200.000 COP / pasadía", accent: "forest",
    cover: "/media/villa-ernesta/cover.jpg", video: "/media/villa-ernesta/tour.mp4",
    gallery: [
      "/media/villa-ernesta/frame-1.jpg",
      "/media/villa-ernesta/frame-2.jpg",
      "/media/villa-ernesta/frame-3.jpg",
      "/media/villa-ernesta/frame-4.jpg",
      "/media/villa-ernesta/frame-5.jpg",
      "/media/villa-ernesta/frame-6.jpg"
    ],
    amenities: ["4 habitaciones", "6 baños", "Sala y comedor", "Cocina", "Zona social", "Bar", "Piscina infantil tipo jacuzzi", "Hamacas", "Columpios", "Quebrada cercana"],
    rules: {
      title: "Recomendaciones para los visitantes de la finca Villa Ernesta",
      sections: [
        {
          heading: "Privacidad y servicio",
          items: [
            "Villa Ernesta es un sitio privado, por lo que solo estarán ustedes y sus acompañantes durante la estadía.",
            "La atención es de autoservicio. Si lo consideran necesario, recomendamos llevar a alguien que pueda apoyar en la cocina o en la organización."
          ]
        },
        {
          heading: "Sonido y entretenimiento",
          items: [
            "La finca cuenta con sistema de sonido, pero depende de la conexión eléctrica, que en ocasiones puede ser inestable en Yuto.",
            "Recomendamos llevar un sistema de sonido inalámbrico o memorias USB con su música favorita, ya que el servicio de internet puede presentar intermitencias."
          ]
        },
        {
          heading: "Utensilios y elementos básicos",
          items: [
            "No olviden llevar elementos desechables como platos, vasos, cubiertos, servilletas y recipientes para servir y preparar los alimentos.",
            "Si planean hacer asados, recuerden llevar carbón o brasas, ya que la finca solo cuenta con la parrilla."
          ]
        },
        {
          heading: "Ropa de cama y toallas",
          items: ["Las camas estarán listas con sábanas y cobijas. Si lo prefieren, pueden llevar sus propias cobijas y toallas."]
        },
        {
          heading: "Uso de gas o leña",
          items: ["En caso de requerir gas o leña, el servicio tiene un costo adicional de $30.000 COP."]
        },
        {
          heading: "Depósito de seguridad",
          items: ["Es necesario dejar un depósito de seguridad de $200.000 COP, que será reembolsado al finalizar la estadía, siempre que se verifique que no haya daños en las instalaciones."]
        },
        {
          heading: "Reservas y pagos",
          items: [
            "Para separar la fecha, es necesario realizar un depósito del 50 % del valor total.",
            "El saldo pendiente y el depósito de seguridad deben pagarse dos días antes del ingreso.",
            "Una vez realizado el pago para el ingreso a Villa Ernesta, si por cualquier motivo se desiste de la reserva, se aplicará una penalidad del 25 % sobre el valor pagado."
          ]
        }
      ],
      note: "Gracias por su atención y por elegir la finca Villa Ernesta. ¡Disfruten de su estadía en este espacio tranquilo y privado!"
    }
  }
];
