export default async function PortalBoda({ params }: { params: Promise<{ token: string }> }) {
  await params;
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 22 }}>Mi boda</h1>
      <p>Pendiente de la fase 2: portal de novios con enlace personal.</p>
    </main>
  );
}
