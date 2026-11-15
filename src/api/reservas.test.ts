import { describe, expect, it } from "vitest";
import { ocupadasEnRango, type Calendario, type ReservaCalendario } from "./reservas";

function reserva(id: number, hab: number, checkin: string, checkout: string, estado: ReservaCalendario["estado"] = "CONFIRMADA"): ReservaCalendario {
  return { idReserva: id, idHabitacion: hab, huesped: `Huésped ${id}`, checkin, checkout, noches: 1, estado, canal: "PRESENCIAL" };
}

function calendario(reservas: ReservaCalendario[]): Calendario {
  return { desde: "2026-11-15", hasta: "2026-11-29", hoy: "2026-11-15", habitaciones: [], reservas };
}

describe("ocupadasEnRango (misma regla de cruce que el servidor)", () => {
  const cal = calendario([
    reserva(1, 101, "2026-11-16", "2026-11-18"),
    reserva(2, 102, "2026-11-20", "2026-11-22"),
    reserva(3, 103, "2026-11-10", "2026-11-12", "COMPLETADA"),
  ]);

  it("marca la habitacion que se cruza con las noches pedidas", () => {
    const ocupadas = ocupadasEnRango(cal, "2026-11-17", "2026-11-19");
    expect([...ocupadas.keys()]).toEqual([101]);
    expect(ocupadas.get(101)?.idReserva).toBe(1);
  });

  it("llegar el dia en que otro sale esta permitido (rango [llegada, salida))", () => {
    expect(ocupadasEnRango(cal, "2026-11-18", "2026-11-20").size).toBe(0);
    expect(ocupadasEnRango(cal, "2026-11-14", "2026-11-16").size).toBe(0);
  });

  it("no choca con la reserva que se esta editando", () => {
    expect(ocupadasEnRango(cal, "2026-11-16", "2026-11-19", 1).size).toBe(0);
  });

  it("las completadas no ocupan", () => {
    expect(ocupadasEnRango(cal, "2026-11-10", "2026-11-12").size).toBe(0);
  });
});
