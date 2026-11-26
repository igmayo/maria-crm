export default function Inicio() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px" }}>
      <p style={{ color: "#8A5A00", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", fontSize: 13 }}>
        Versión de prueba
      </p>
      <h1 style={{ fontSize: 36, margin: "8px 0 16px" }}>María, la asistente de Guadalquivir Catering</h1>
      <p>Entorno de validación. Aquí irán el chat público, el portal de novios y el panel del equipo.</p>
      <ul>
        <li><a href="/chat">Chat público (clientes nuevos)</a></li>
        <li><a href="/equipo">Panel del equipo</a></li>
      </ul>
    </main>
  );
}
