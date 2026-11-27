# CRM con agente María · Guadalquivir Catering — objetivos y decisiones

Estado a 27/11/2026. Diseño con visto bueno de la empresa. Hecho: esquema y permisos, núcleo del agente, login del equipo, bandeja con conversación y "Nuevo contacto". Sin despliegue ni datos reales.

## Objetivos
1. Centralizar conversaciones.
2. Ahorrar tiempo de respuesta.
3. Generar leads nuevos ya estructurados.
4. Agilizar procesos.

## Alcance
- Chat web (WhatsApp más adelante, porque la API de Meta está bloqueada por burocracia interna) + CRM + portal privado para los novios.
- Las fichas de boda se introducen a mano (Parker no exporta). Los pagos quedan fuera: María no habla de ellos.

## Decisiones cerradas
- **Cambios de los novios:** se registran como petición; el comercial valida. María nunca aplica cambios.
- **Asignación:** el administrador asigna los leads a mano. La ficha la crea el administrador o el comercial.
- **Seguimiento:** María retoma la conversación por botón y automáticamente a las 24 h. Los pendientes sin atender escalan al administrador a las 24 h (48 h si cruza un fin de semana). María recoge día y hora preferidos de reunión y el comercial confirma.
- **Fotos y audios:** María no los procesa, avisa al comercial. Los ve todo el equipo con acceso a la conversación.
- **Acceso de novios:** enlace personal sin contraseña, por correo y copiable por el comercial. Si lo pierden, María lo reenvía solo al correo de la ficha tras preguntas básicas. Dietas y alergias piden código por correo.
- **Acceso del equipo:** correo y contraseña. Solo el responsable y el administrador pueden compartir una conversación. Los novios solo ven a su comercial responsable.
- **D21 · Lead por otro canal:** alta manual con formulario "Nuevo contacto" (administrador o comercial), pudiendo pegar el correo original. El reenvío automático a una dirección de leads queda para una fase posterior.
- **D22 · Visibilidad:** cada comercial ve solo sus conversaciones y las compartidas; los administradores ven todo (puede haber varios).
- **D23 · Copias:** copias automáticas diarias, nada se borra definitivamente, prueba de restauración trimestral y copia semanal externa en una carpeta de Google Drive de la empresa (acceso restringido).
- **D24 · Dos titulares:** cada boda tiene dos titulares con enlace personal cada uno, en un único hilo donde se ve quién escribe ("X está escribiendo"). María los llama por su nombre. Si piden cosas contradictorias, registra ambas y avisa al comercial; no media.
- **D25 · Pestañas:** Hoy = lo que requiere acción mía hoy; Bandeja = mis conversaciones y las compartidas, con buscador y filtros (el administrador ve además "Sin asignar" y filtro por comercial); Pendientes = tareas (preguntas de María, audios y fotos sin atender, cambios por validar, reuniones por confirmar, notas con seguimiento).
- **D26 · Roles:** administrador, comercial, diseño, almacén y administración. Diseño, almacén y administración ven solo lo que se les comparta. Panel de administración para dar de alta, desactivar (sin borrar historial), cambiar rol y reasignar.
- **D27 · Proyecto independiente:** no es un módulo del CRM de Sedee.
- **D28 · Framework:** Next.js.
- **D29 · Cuentas:** Claude API, GitHub y Vercel a nombre de Iván; Resend y Supabase a nombre del cliente.
- **D30 · Entornos:** pruebas y producción separados, con claves distintas.
- **D31 · WordPress:** de momento María no se integra en la web. Se prueba por fuera. Cuando se integre, solo la burbuja de María, sin el botón de WhatsApp actual.
- **D32 · Dónde vive:** subdominios propios; para validar, la URL de Vercel.
- **D33 · Cómo se incrusta en WordPress:** fragmento de código propio, sin plugin.
- **D34 · Disponibilidad:** María atiende siempre, también fuera de horario, con criterio sobre el negocio; el equipo responde en horario de oficina. Se presenta siempre como asistente de IA.
- **D35 · Asignar conversaciones:** solo el administrador asigna y reasigna, con un selector en la cabecera de la conversación. Al asignar cambian a la vez el responsable de la boda y de sus conversaciones; la conversación pasa a "Te toca" (si estaba cerrada, sigue cerrada). Solo se puede asignar a comerciales activos. No hay "tomar conversación": un comercial no ve las sin asignar (D22).

## Pendiente de diseñar
- Pantalla "Sin asignar" del administrador.
- Capa de privacidad y RGPD y encargo de tratamiento de datos entre la empresa e Iván.
- Banco de 30–50 preguntas reales con respuesta de los comerciales.
- Plan detallado del piloto (2 comerciales, unas 10 bodas).
