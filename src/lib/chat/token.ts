import { createHash, randomBytes } from "node:crypto";

/** Clave secreta de una conversación pública. Solo se guarda su huella. */
export function generarToken(): string {
  return randomBytes(32).toString("base64url");
}

export function huella(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
