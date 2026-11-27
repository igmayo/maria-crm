import { describe, it, expect, vi, afterEach } from "vitest";
import { validarInvitacion, estadoUsuario, enlaceInvitacion, contenidoInvitacion, contrasenaValida } from "@/lib/usuarios";
import { correoHtml, correoTexto, esc } from "@/lib/plantilla-correo";
import { enviarCorreo, correoConfigurado, remitente } from "@/lib/correo";
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
  it("el contenido incluye el enlace y quién invita", () => {
    const t = contenidoInvitacion("Marta", "Iván", "https://x.test/e", false);
    expect(t.contenido.parrafos[0]).toContain("Iván te ha invitado");
    expect(t.contenido.boton?.url).toBe("https://x.test/e");
    expect(contenidoInvitacion("Marta", "Iván", "https://x.test/e", true).asunto).toContain("Nuevo enlace");
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

describe("plantilla de correo", () => {
  const c = contenidoInvitacion("Marta <b>", "Iván", "https://x.test/e?a=1&b=2", false).contenido;
  it("escapa lo que escribe una persona", () => {
    expect(esc(`<script>"x"&'y'`)).toBe("&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;");
    const html = correoHtml(c, "http://localhost:3000");
    expect(html).not.toContain("Marta <b>");
    expect(html).toContain("Marta &lt;b&gt;");
  });
  it("lleva botón, enlace de respaldo, resumen oculto y datos de la empresa", () => {
    const html = correoHtml(c, "http://localhost:3000");
    expect(html).toContain("Crear mi contraseña");
    expect(html.match(/https:\/\/x\.test\/e\?a=1&amp;b=2/g)?.length).toBe(2);
    expect(html).toContain("display:none");
    expect(html).toContain("Alcalá de Guadaíra");
  });
  it("el logo solo sale con una dirección pública https", () => {
    expect(correoHtml(c, "http://localhost:3000")).not.toContain("<img");
    expect(correoHtml(c, "https://app.ejemplo.test")).toContain('src="https://app.ejemplo.test/logo-guadalquivir.png"');
  });
  it("la versión de texto tiene el enlace y no tiene etiquetas", () => {
    const t = correoTexto(c);
    expect(t).toContain("https://x.test/e?a=1&b=2");
    expect(t).not.toMatch(/<(html|table|a |p )/);
  });
});

describe("correo con Resend", () => {
  it("el remitente muestra siempre el nombre de la empresa", () => {
    expect(remitente("Otro Nombre <hola@ejemplo.test>")).toBe("Guadalquivir Catering <hola@ejemplo.test>");
    expect(remitente("hola@ejemplo.test")).toBe("Guadalquivir Catering <hola@ejemplo.test>");
  });
  it("manda html y reply_to cuando se piden", async () => {
    vi.stubEnv("RESEND_API_KEY", "k"); vi.stubEnv("RESEND_FROM", "x <a@b.test>");
    const f = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    await enviarCorreo({ para: "p@q.test", asunto: "A", texto: "T", html: "<p>H</p>", responderA: "iv@an.test" }, f as unknown as typeof fetch);
    expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({ html: "<p>H</p>", reply_to: "iv@an.test", from: "Guadalquivir Catering <a@b.test>" });
  });
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
    expect(JSON.parse(init.body)).toMatchObject({ from: "Guadalquivir Catering <hola@ejemplo.test>", to: ["a@b.co"], subject: "Hola" });
  });
  it("si Resend rechaza o la red falla, devuelve false sin escribir la clave en el log", async () => {
    vi.stubEnv("RESEND_API_KEY", "clave-de-prueba"); vi.stubEnv("RESEND_FROM", "x@y.test");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await enviarCorreo({ para: "a@b.co", asunto: "x", texto: "y" }, vi.fn().mockResolvedValue({ ok: false, status: 403 }) as unknown as typeof fetch)).toBe(false);
    expect(await enviarCorreo({ para: "a@b.co", asunto: "x", texto: "y" }, vi.fn().mockRejectedValue(new Error("clave-de-prueba caída")) as unknown as typeof fetch)).toBe(false);
    expect(JSON.stringify(log.mock.calls)).not.toContain("clave-de-prueba");
  });
});
