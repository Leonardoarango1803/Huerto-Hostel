import { describe, expect, it } from "vitest";
import { diaCorto, diaLargo, fechaDMA, fechaHora, finDeMes, haceCuanto, inicioDeMes, sumarDias } from "./fechas";

describe("fechas del hostel (dia local, nunca UTC)", () => {
  it("suma dias cruzando meses y años", () => {
    expect(sumarDias("2026-11-30", 1)).toBe("2026-12-01");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("una fecha sola se muestra como ese mismo dia (no el anterior por la zona horaria)", () => {
    expect(fechaDMA("2026-11-07")).toBe("07/11/2026");
    expect(fechaDMA(null)).toBe("—");
    expect(fechaDMA("no-es-fecha")).toBe("—");
  });

  it("inicio y fin de mes, con desfase", () => {
    expect(inicioDeMes("2026-11-15")).toBe("2026-11-01");
    expect(finDeMes("2026-02-10")).toBe("2026-02-28");
    expect(inicioDeMes("2026-01-15", -1)).toBe("2025-12-01");
  });

  it("formatos cortos para tablas y graficos", () => {
    expect(diaCorto("2026-11-05")).toBe("5 nov");
    expect(diaLargo("2026-11-05T10:00:00")).toBe("5 nov 2026");
    expect(fechaHora("2026-11-05T14:30:00")).toBe("05/11 14:30");
    expect(fechaHora(undefined)).toBe("—");
  });

  it("haceCuanto lee la hora del servidor como hora de Lima", () => {
    const ahora = new Date("2026-11-15T15:00:00-05:00").getTime();
    expect(haceCuanto("2026-11-15T15:00:00", ahora)).toBe("ahora");
    expect(haceCuanto("2026-11-15T14:59:30", ahora)).toBe("hace 30 s");
    expect(haceCuanto("2026-11-15T14:50:00", ahora)).toBe("hace 10 min");
    expect(haceCuanto("2026-11-15T12:00:00", ahora)).toBe("hace 3 h");
  });
});
