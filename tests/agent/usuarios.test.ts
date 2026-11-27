import { describe, it, expect, vi, afterEach } from "vitest";
import { validarInvitacion, estadoUsuario, enlaceInvitacion, textoInvitacion, contrasenaValida } from "@/lib/usuarios";
import { enviarCorreo, correoConfigurado } from "@/lib/correo";
import { exigeSesion } from "@/lib/rutas";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("invitar usuarios", () => {
  it("normaliza nombre y correo", () => {
    expect(validarInvitacion("  Marta   López ", " Marta@Ejemplo.COM ", "comercial")).toEqual({ ok: true, nombre: "Marta López", correo: "marta@ejemplo.com", rol: "comercial" });
  });
  it("rechaza datos malos", () => {
    expect(validarInvitacion("M", "a@b.co", "comercial")).toEqual({ ok: false, error: "nombre" });
    expect(validarInvitacion("Marta", "sin-arroba", "comercial")).toEqual({ ok: false, error: "correo" });
    expect(validarInvitacion("Marta", "a@b.co", "superjefe")).toEqual({ ok: false, error: "rol" });
  });
  it("el estado distingue invitado de activo y desactivado", () => {
    expect(estadoUsuario(false, "2026-11-27")).toBe("desactivado");
    expect(estadoUsuario(true, null)).toBe("invitado");
    expect(estadoUsuario(true, "2026-11-27T10:00:00Z")).toBe("activo");
    expect(estadoUsuario(true, undefined)).toBe("activo"); // sin dato, no afirmamos que esté pendiente
  });
  it("el enlace codifica el token y lleva el tipo", () => {
    expect(enlaceInvitacion("https://x.test", "a b/c", "invite")).toBe("https://x.test/equipo/invitacion?token_hash=a%20b%2Fc&type=invite");
  });
  it("el correo incluye el enlace y quién invita", () => {
    const t = textoInvitacion("Marta", "Iván", "https://x.test/e", false);
    expect(t.texto).toContain("https://x.test/e");
    expect(t.texto).toContain("Iván te ha invitado");
    expect(textoInvitacion("Marta", "Iván", "https://x.test/e", true).asunto).toContain("Nuevo enlace");
  });
  it("valida la contraseña", () => {
    expect(contrasenaValida("corta", "corta")).toBe("corta");
    expect(contrasenaValida("larga-de-sobra", "otra-distinta")).toBe("distintas");
    expect(contrasenaValida("larga-de-sobra", "larga-de-sobra")).toBe("ok");
  });
  it("la página de invitación no exige sesión, el resto del panel sí", () => {
    expect(exigeSesion("/equipo/invitacion")).toBe(false);
    expect(exigeSesion("/equipo/usuarios")).toBe(true);
  });
});

describe("correo con Resend", () => {
  it("sin configuración no envía ni llama a la red", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("RESEND_FROM", "");
    const f = vi.fn();
    expect(correoConfigurado()).toBe(false);
    expect(await enviarCorreo({ para: "a@b.co", asunto: "x", texto: "y" }, f as unknown as typeof fetch)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
  it("envía a Resend con la clave en la cabecera, no en el cuerpo", async () => {
    vi.stubEnv("RESEND_API_KEY", "clave-de-prueba"); vi.stubEnv("RESEND_FROM", "María <hola@ejemplo.test>");
    const f = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    expect(await enviarCorreo({ para: "a@b.co", asunto: "Hola", texto: "Texto" }, f as unknown as typeof fetch)).toBe(true);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer clave-de-prueba");
    expect(init.body).not.toContain("clave-de-prueba");
    expect(JSON.parse(init.body)).toMatchObject({ from: "María <hola@ejemplo.test>", to: ["a@b.co"], subject: "Hola" });
  });
  it("si Resend rechaza o la red falla, devuelve false sin escribir la clave en el log", async () => {
    vi.stubEnv("RESEND_API_KEY", "clave-de-prueba"); vi.stubEnv("RESEND_FROM", "x@y.test");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await enviarCorreo({ para: "a@b.co", asunto: "x", texto: "y" }, vi.fn().mockResolvedValue({ ok: false, status: 403 }) as unknown as typeof fetch)).toBe(false);
    expect(await enviarCorreo({ para: "a@b.co", asunto: "x", texto: "y" }, vi.fn().mockRejectedValue(new Error("clave-de-prueba caída")) as unknown as typeof fetch)).toBe(false);
    expect(JSON.stringify(log.mock.calls)).not.toContain("clave-de-prueba");
  });
});
