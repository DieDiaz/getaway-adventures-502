# Getaway Adventures 502 — Reservaciones

Vite + React + TypeScript + Supabase.

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # genera dist/
```

Variables en `.env` (ver `.env.example`). Solo las que empiezan con `VITE_` llegan al navegador;
`DATABASE_URL` se usa únicamente en los scripts locales.

## Base de datos

- `supabase/schema.sql`: tablas `ga_tours`, `ga_salidas`, `ga_reservaciones`, `ga_admins`,
  funciones y políticas RLS. Es idempotente: `npm run db:migrate`.
- El público solo puede **ver tours** y **crear reservaciones** mediante la función
  `ga_crear_reservacion`, que valida el cupo de forma atómica. Nadie sin rol de admin puede leer reservaciones.

### Panel de administración (`/admin`)

- **Dashboard**: ventas, cobrado, por cobrar, ticket promedio, cancelación, ventas por semana/mes y por tour,
  viajeros por día de salida, comportamiento de clientes, ocupación de próximas salidas y rendimiento de promociones.
- **Reservaciones**: búsqueda, filtros, cambio de estado y exportación CSV.
- **Tours y salidas**: crear viajes, editar, subir fotos (Supabase Storage, bucket `ga-media`), ubicación en el mapa,
  **dar de baja / reactivar**, eliminar (solo sin reservaciones) y generar/cerrar fechas de salida.
- **Promociones**: con imagen, código de descuento, vigencia y tour; aparecen en la portada.
- **Clientes**: base de clientes con segmentos, mensajes personalizados por WhatsApp y correo (CCO) y exportación CSV.
  Por defecto solo muestra a quienes aceptaron recibir promociones.

SQL del módulo: `supabase/admin.sql` (`npm run db:admin`).

### Idiomas (inglés / español)

La página pública es bilingüe: se abre en **inglés** por defecto y el selector **EN / ES** del menú cambia el idioma
(se recuerda en el navegador). Los textos fijos están en `src/lib/i18n.tsx`.
Los textos de tours y promociones tienen columnas `*_en` (`supabase/i18n.sql`, `npm run db:i18n`);
se editan en el panel en la sección "English version". Si un campo en inglés está vacío, se muestra el español.

### Administrador

1. Crea el usuario en Supabase → Authentication → Users (correo + contraseña).
2. `npm run make-admin -- correo@ejemplo.com`
3. Entra en `/admin`.

### Tours, fechas y fotos

- `supabase/seed.sql` contiene los tours reales y genera salidas diarias para los próximos 30 días:
  `npm run db:seed` (sobrescribe los datos de esos tours; las salidas con reservaciones se respetan).
- También se pueden editar en el Table Editor de Supabase:
  - `ga_tours.imagen_url` / `galeria`: rutas a fotos dentro de `public/` (p. ej. `/getaway-adventures-imagenes/volcan/x.jpg`).
    Las fotos se sirven como archivos estáticos; la base solo guarda la ruta.
  - `ga_salidas`: una fila por fecha con su `cupo` (y `precio_q` opcional para precios especiales).

La foto del hero se define en `src/pages/Home.tsx` (`ScrollExpand`, admite `mediaType="video"`).
El número de WhatsApp está en `src/lib/supabase.ts` (`WHATSAPP`).
