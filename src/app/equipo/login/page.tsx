import Image from "next/image";
import CampoContrasena from "@/components/CampoContrasena";
import { entrar } from "./acciones";

const mensajes: Record<string, string> = {
  datos: "El correo o la contraseña no son correctos.",
  inactivo: "Tu cuenta aún no está activa. Pídele acceso al administrador.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="centro">
      <div className="tarjeta">
        <div className="cabecera">
          <Image src="/logo-guadalquivir.png" alt="Guadalquivir Catering" width={240} height={80} priority style={{ height: "auto" }} />
          <div>
            <h1>Entra a tu panel</h1>
            <p>Equipo de Guadalquivir Catering</p>
          </div>
        </div>
        <form action={entrar} className="formulario">
          {error && mensajes[error] && <p className="error" role="alert">{mensajes[error]}</p>}
          <label className="lb">Correo<input className="in" name="correo" type="email" autoComplete="username" required /></label>
          <CampoContrasena />
          <button type="submit" className="boton">Entrar</button>
        </form>
        <p className="pie">¿No tienes cuenta? Pídesela al administrador.</p>
      </div>
    </main>
  );
}
