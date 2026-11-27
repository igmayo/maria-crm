import { describe, it, expect } from "vitest";
import { exigeSesion } from "@/lib/rutas";

describe("rutas protegidas", () => {
  it("el panel exige sesión", () => {
    expect(exigeSesion("/equipo")).toBe(true);
    expect(exigeSesion("/equipo/bandeja")).toBe(true);
  });
  it("el login no la exige", () => {
    expect(exigeSesion("/equipo/login")).toBe(false);
  });
  it("las páginas públicas no la exigen", () => {
    expect(exigeSesion("/")).toBe(false);
    expect(exigeSesion("/chat")).toBe(false);
    expect(exigeSesion("/equipoX")).toBe(false);
  });
});
