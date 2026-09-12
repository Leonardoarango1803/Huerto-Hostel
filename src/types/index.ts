export type RoomStatus =
  | "disponible"
  | "ocupado"
  | "limpieza"
  | "mantenimiento";

export interface Room {
  id: string;
  number: string;
  type: string;
  capacity: number;
  pricePerNight: number;
  status: RoomStatus;
  guestName?: string;
  checkOutDate?: string;
}

export interface Reservation {
  id: string;
  guestName: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  status: "confirmada" | "pendiente" | "completada" | "cancelada";
  totalAmount: number;
  paymentStatus: "pagado" | "pendiente" | "parcial";
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "Administrador" | "Recepcionista" | "Limpieza";
  shift: string;
  status: "activo" | "inactivo";
}
