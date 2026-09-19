# Encuestas Olancho y Vigilancia Olancho

Proyecto Next.js de la Región Sanitaria de Olancho. Contiene el sistema de Encuestas de Satisfacción y el módulo independiente **VIGILANCIA OLANCHO — Notificación obligatoria del sector privado**.

- Encuestas conserva sus tablas, usuarios y rutas existentes.
- Vigilancia usa rutas `/vigilancia`, tablas `vigilancia_*`, roles y auditoría independientes.
- Procedimiento operativo: [docs/OPERACION_VIGILANCIA_OLANCHO.md](docs/OPERACION_VIGILANCIA_OLANCHO.md).
- La base de datos utiliza Supabase y la publicación prevista utiliza Vercel.
