import { describe, it, expect } from "vitest";
import { partirNegritas } from "@/lib/texto";

describe("negritas", () => {
  it("separa los trozos en negrita", () => {
    expect(partirNegritas("Reunión: **martes a las 17:00**. Sin confirmar.")).toEqual([
      { texto: "Reunión: ", negrita: false }, { texto: "martes a las 17:00", negrita: true }, { texto: ". Sin confirmar.", negrita: false },
    ]);
  });
  it("sin marcas devuelve el texto tal cual", () => {
    expect(partirNegritas("hola")).toEqual([{ texto: "hola", negrita: false }]);
  });
  it("asteriscos sueltos o sin cerrar no se rompen", () => {
    expect(partirNegritas("a ** b")).toEqual([{ texto: "a ** b", negrita: false }]);
    expect(partirNegritas("**abierta")).toEqual([{ texto: "**abierta", negrita: false }]);
  });
  it("el HTML se queda como texto", () => {
    expect(partirNegritas("**<b>x</b>**")).toEqual([{ texto: "<b>x</b>", negrita: true }]);
  });
  it("varias negritas seguidas", () => {
    expect(partirNegritas("**a** y **b**").filter((t) => t.negrita).map((t) => t.texto)).toEqual(["a", "b"]);
  });
});
