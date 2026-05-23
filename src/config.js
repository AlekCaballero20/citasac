// 1) Pega aquí la configuración de tu app web de Firebase.
// Firebase Console > Project settings > General > Your apps > Web app > SDK setup and configuration.
export const firebaseConfig = {
  apiKey: "AIzaSyAfR-VH1oGwZfA4sJJPaEEzERVbZrvOKBg",
  authDomain: "citas-con-cata.firebaseapp.com",
  projectId: "citas-con-cata",
  storageBucket: "citas-con-cata.firebasestorage.app",
  messagingSenderId: "471203187760",
  appId: "1:471203187760:web:7202cd31808e231199f1f5"
};

// 2) Todo esto es modificable. Cambien nombres, correos, categorías, presets y textos.
export const APP_CONFIG = {
  appName: "Citas con Cata",
  coupleId: "alek-cata",
  allowedEmails: [
    "alekcaballeromusic@gmail.com",
    "catalina.medina.leal@gmail.com"
  ],
  categories: [
    "Comida",
    "Cine / series",
    "Dulces / postres",
    "Naturaleza",
    "Arte / cultura",
    "Casa",
    "Juegos",
    "Moto / paseo",
    "Espiritualidad",
    "Sorpresa"
  ],
  categoryIcons: {
    "Comida": "🍽️",
    "Cine / series": "🎬",
    "Dulces / postres": "🍰",
    "Naturaleza": "🌿",
    "Arte / cultura": "🎨",
    "Casa": "🏠",
    "Juegos": "🎮",
    "Moto / paseo": "🏍️",
    "Espiritualidad": "🕯️",
    "Sorpresa": "🎁",
    "Sin categoría": "📌"
  },
  budgetLevels: [
    { value: "gratis", label: "Gratis" },
    { value: "bajo", label: "$ · suavecito" },
    { value: "medio", label: "$$ · normal" },
    { value: "alto", label: "$$$ · ocasión especial" }
  ],
  energyLevels: [
    { value: "baja", label: "Baja · modo cobija" },
    { value: "media", label: "Media · humanos funcionales" },
    { value: "alta", label: "Alta · hay voluntad" }
  ],
  starterIdeas: [
    {
      title: "Ir por helado y caminar sin afán",
      category: "Dulces / postres",
      budgetLevel: "bajo",
      energyLevel: "baja",
      durationMinutes: 60,
      repeatEveryDays: 21,
      locationType: "Cerca, caminable o en moto",
      idealMoment: "Después de un día largo",
      tags: ["dulce", "simple", "conversar"],
      description: "Plan corto para reconectar sin convertirlo en producción cinematográfica de bajo presupuesto."
    },
    {
      title: "Cine con combo compartido",
      category: "Cine / series",
      budgetLevel: "medio",
      energyLevel: "baja",
      durationMinutes: 180,
      repeatEveryDays: 45,
      locationType: "Centro comercial o cine cercano",
      idealMoment: "Noche o domingo",
      tags: ["película", "relajado", "palomitas"],
      description: "Elegir película, comprar algo rico y no discutir 40 minutos por los asientos, si es que la civilización lo permite."
    },
    {
      title: "Probar un restaurante nuevo",
      category: "Comida",
      budgetLevel: "medio",
      energyLevel: "media",
      durationMinutes: 120,
      repeatEveryDays: 30,
      locationType: "Bogotá / Madrid / cerca de donde estén",
      idealMoment: "Cuando quieran sentir que la vida adulta tiene recompensas",
      tags: ["comida", "nuevo", "salir"],
      description: "Guardar restaurantes pendientes y calificarlos después. Una investigación científica con papas a la francesa."
    },
    {
      title: "Noche de juegos de mesa o videojuegos",
      category: "Juegos",
      budgetLevel: "gratis",
      energyLevel: "baja",
      durationMinutes: 90,
      repeatEveryDays: 14,
      locationType: "Casa o Musicala",
      idealMoment: "Noche tranquila",
      tags: ["casa", "risa", "competencia sana-ish"],
      description: "Escoger un juego, poner algo de comer y aceptar con dignidad cuando alguien pierda. Difícil, pero hermoso."
    },
    {
      title: "Café bonito + postre compartido",
      category: "Dulces / postres",
      budgetLevel: "bajo",
      energyLevel: "media",
      durationMinutes: 75,
      repeatEveryDays: 21,
      locationType: "Café lindo o panadería especial",
      idealMoment: "Tarde libre",
      tags: ["café", "postre", "charla"],
      description: "Buscar un lugar nuevo o repetir uno que ya sepan que no traiciona."
    },
    {
      title: "Picnic sencillo",
      category: "Naturaleza",
      budgetLevel: "bajo",
      energyLevel: "media",
      durationMinutes: 120,
      repeatEveryDays: 60,
      locationType: "Parque o zona verde",
      idealMoment: "Día soleado",
      tags: ["aire", "naturaleza", "fotos"],
      description: "Llevar manta, algo para comer y la esperanza ingenua de que no llueva."
    },
    {
      title: "Spa casero",
      category: "Casa",
      budgetLevel: "gratis",
      energyLevel: "baja",
      durationMinutes: 90,
      repeatEveryDays: 30,
      locationType: "Casa",
      idealMoment: "Cuando estén agotados",
      tags: ["descanso", "cuidado", "casa"],
      description: "Mascarilla, música suave, masajes y cero productividad. Una rebelión contra el capitalismo con crema hidratante."
    },
    {
      title: "Paseo en moto sin destino rígido",
      category: "Moto / paseo",
      budgetLevel: "medio",
      energyLevel: "alta",
      durationMinutes: 180,
      repeatEveryDays: 60,
      locationType: "Ruta corta y segura",
      idealMoment: "Mañana o tarde con buen clima",
      tags: ["moto", "paisaje", "salir"],
      description: "Elegir una ruta suave, parar por algo rico y volver antes de que el tráfico decida escribir tragedia griega."
    },
    {
      title: "Museo, galería o plan cultural",
      category: "Arte / cultura",
      budgetLevel: "bajo",
      energyLevel: "media",
      durationMinutes: 120,
      repeatEveryDays: 60,
      locationType: "Bogotá",
      idealMoment: "Fin de semana",
      tags: ["arte", "inspiración", "caminar"],
      description: "Ir a ver cosas bonitas, raras o profundas y luego hablar como si entendieran todo. A veces hasta pasa."
    },
    {
      title: "Noche sin celular",
      category: "Casa",
      budgetLevel: "gratis",
      energyLevel: "baja",
      durationMinutes: 120,
      repeatEveryDays: 14,
      locationType: "Casa",
      idealMoment: "Cuando estén saturados",
      tags: ["desconexión", "conversar", "intimidad"],
      description: "Guardar celulares, cocinar algo, hablar, jugar o simplemente existir sin pantallas. Primitivo, casi revolucionario."
    }
  ]
};
