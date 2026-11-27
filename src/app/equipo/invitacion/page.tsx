import Image from "next/image";
import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import { crearContrasena } from "./acciones";

const mensajes: Record<string, string> = {
  corta: "La contraseña debe tener al menos 10 caracteres.",
  distintas: "Las dos contraseñas no coinciden.",
  guardar: "No se ha podido guardar la contraseña. Prueba con otra o pide un enlace nuevo.",
};

export default async function Invitacion({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string; error?: string }> }) {
  const { token_hash, type, error } = await searchParams;
  const sb = await clienteServidor();
  const { data } = await sb.auth.getUser();
  // Sin enlace válido y sin sesión abierta, no hay nada que hacer aquí.
  const puede = Boolean(token_hash) || Boolean(data.user);
  const enlaceMalo = error === "enlace" || !puede;
  return (
    <main className="centro">
      <div className="tarjeta">
        <div className="cabecera">
          <Image src="/logo-guadalquivir.png" alt="Guadalquivir Catering" width={240} height={80} priority style={{ height: "auto" }} />
          <div>
            <h1>{enlaceMalo ? "Enlace no válido" : "Crea tu contraseña"}</h1>
            <p>{enlaceMalo ? "El enlace ha caducado o ya se usó." : "Equipo de Guadalquivir Catering"}</p>
          </div>
        </div>
        {enlaceMalo ? (
          <p className="pie">Pide al administrador que te envíe otra invitación. <Link href="/equipo/login">Ir a entrar</Link></p>
        ) : (
          <form action={crearContrasena} className="formulario">
            {error && mensajes[error] && <p className="error" role="alert">{mensajes[error]}</p>}
            {token_hash && <input type="hidden" name="token_hash" value={token_hash} />}
            {type && <input type="hidden" name="type" value={type} />}
            <label className="lb">Contraseña (mínimo 10 caracteres)<input className="in" name="contrasena" type="password" autoComplete="new-password" minLength={10} required /></label>
            <label className="lb">Repite la contraseña<input className="in" name="repetir" type="password" autoComplete="new-password" minLength={10} required /></label>
            <button type="submit" className="boton">Guardar y entrar</button>
          </form>
        )}
      </div>
    </main>
  );
}
