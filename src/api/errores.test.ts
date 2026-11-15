import { describe, expect, it } from "vitest";
import { esCajaCerrada, mensajeDeError } from "./errores";

const respuesta = (message: unknown) => ({ response: { data: { message } } });

describe("mensajes de error de la API", () => {
  it("muestra el motivo real que manda el servidor", () => {
    expect(mensajeDeError(respuesta("La habitación ya está reservada."), "No se pudo")).toBe("La habitación ya está reservada.");
  });

  it("sin motivo usa el texto por defecto", () => {
    expect(mensajeDeError(new Error("Network Error"), "Sin conexión")).toBe("Sin conexión");
    expect(mensajeDeError(respuesta("   "), "Por defecto")).toBe("Por defecto");
    expect(mensajeDeError(respuesta(42), "Por defecto")).toBe("Por defecto");
  });

  it("reconoce el rechazo por caja cerrada", () => {
    expect(esCajaCerrada(respuesta("La caja esta cerrada: abre un turno."))).toBe(true);
    expect(esCajaCerrada(respuesta("Otro problema"))).toBe(false);
  });
});
