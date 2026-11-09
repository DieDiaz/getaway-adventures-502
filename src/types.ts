export interface Tour {
  id: string;
  slug: string;
  nombre: string;
  destino: string;
  descripcion: string;
  imagen_url: string | null;
  precio_q: number;
  duracion: string;
  incluye: string[];
  punto_salida: string;
  horario: string | null;
  galeria: string[];
  lat: number | null;
  lng: number | null;
  activo: boolean;
  orden: number;
}

export interface SalidaDisponible {
  id: string;
  fecha: string;
  cupo: number;
  disponibles: number;
  precio_q: number;
}

export interface Salida {
  id: string;
  tour_id: string;
  fecha: string;
  cupo: number;
  precio_q: number | null;
  activo: boolean;
}

export type EstadoReservacion = 'pendiente' | 'confirmada' | 'pagada' | 'cancelada';

export interface Reservacion {
  id: string;
  codigo: string;
  salida_id: string;
  nombre: string;
  email: string;
  telefono: string;
  personas: number;
  notas: string | null;
  subtotal_q: number | null;
  descuento_q: number;
  total_q: number;
  promo_id: string | null;
  acepta_promos: boolean;
  estado: EstadoReservacion;
  created_at: string;
  ga_salidas: { fecha: string; tour_id: string; ga_tours: { nombre: string } | null } | null;
}

export interface Promocion {
  id: string;
  titulo: string;
  descripcion: string;
  imagen_url: string | null;
  codigo: string | null;
  descuento_pct: number;
  tour_id: string | null;
  desde: string | null;
  hasta: string | null;
  activo: boolean;
  created_at: string;
}

export interface Cliente {
  email: string;
  nombre: string;
  telefono: string;
  reservas: number;
  reservas_activas: number;
  viajeros: number;
  total_q: number;
  pagado_q: number;
  acepta_promos: boolean;
  primera_reserva: string;
  ultima_reserva: string;
  ultimo_viaje: string | null;
  tours: string[];
}
