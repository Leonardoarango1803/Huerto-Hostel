import { describe, expect, it } from "vitest";
import { ACCIONES, INICIO_POR_ROL, MODULOS_POR_ROL, RUTA, puede, puedeEntrar, rutaDeInicio, type Rol } from "./permisos";

const PERSONAL: Rol[] = ["ADMINISTRADOR", "RECEPCIONISTA", "CAJERO", "COCINA", "BAR", "HOUSEKEEPING"];

describe("matriz de accesos del frontend", () => {
  it("cada rol aterriza en un modulo al que puede entrar", () => {
    for (const rol of Object.keys(INICIO_POR_ROL) as Rol[]) {
      expect(MODULOS_POR_ROL[rol]).toContain(INICIO_POR_ROL[rol]);
      expect(rutaDeInicio(rol)).toBe(RUTA[INICIO_POR_ROL[rol]]);
    }
  });

  it("el huesped solo ve su portal y el personal nunca el portal", () => {
    expect(MODULOS_POR_ROL.CLIENTE).toEqual(["portal"]);
    for (const rol of PERSONAL) expect(puedeEntrar(rol, "portal")).toBe(false);
  });

  it("el cajero cobra pero no crea, modifica ni hace check-in de reservas", () => {
    expect(puede("CAJERO", "registrarAdelanto")).toBe(true);
    expect(puede("CAJERO", "hacerCheckout")).toBe(true);
    expect(puede("CAJERO", "crearReserva")).toBe(false);
    expect(puede("CAJERO", "editarReserva")).toBe(false);
    expect(puede("CAJERO", "hacerCheckin")).toBe(false);
  });

  it("solo el administrador edita y da de baja habitaciones (la recepcion cambia su estado)", () => {
    expect(ACCIONES.editarHabitacion).toEqual(["ADMINISTRADOR"]);
    expect(puede("RECEPCIONISTA", "gestionarHabitaciones")).toBe(true);
    expect(puede("RECEPCIONISTA", "editarHabitacion")).toBe(false);
  });

  it("toda accion la tiene al menos el administrador, y quien la ejecuta puede entrar a algun modulo", () => {
    for (const roles of Object.values(ACCIONES)) {
      expect(roles).toContain("ADMINISTRADOR");
      for (const rol of roles) expect(MODULOS_POR_ROL[rol].length).toBeGreaterThan(0);
    }
  });

  it("sin rol no se puede nada", () => {
    expect(puede(undefined, "crearReserva")).toBe(false);
    expect(puedeEntrar(undefined, "dashboard")).toBe(false);
  });
});
