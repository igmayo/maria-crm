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
- **D36 · Panel de usuarios:** solo el administrador invita, edita (nombre, rol), activa y desactiva. La invitación se envía por correo con Resend y, si el correo falla, se muestra el enlace de un solo uso para copiarlo. El enlace consume el token al crear la contraseña (mínimo 10 caracteres). Nunca puede quedar el sistema sin un administrador activo (base de datos, migración 0006). Al desactivar a alguien o quitarle el rol de comercial, el panel avisa de sus conversaciones abiertas y enlaza a ellas para reasignarlas una a una. El bloque de copias de seguridad aparece como "Pendiente de configurar" hasta que existan (D23).
- **D37 · Correos:** todos los correos de Resend usan una plantilla común con marca (cabecera ámbar, botón, pie con los datos de la empresa tomados de su web), versión HTML y de texto, y un resumen para la bandeja. El remitente muestra siempre "Guadalquivir Catering" (el correo viene de `RESEND_FROM`). Si alguien responde, llega a quien envía (el administrador o, con los novios, su comercial). El logo se incluye cuando `APP_URL` es una dirección pública https. Datos de empresa en `src/lib/empresa.ts`.

- **D38 · Ficha editable y acceso de novios:** la ficha tiene tipo de ceremonia (religiosa/civil), horas de ceremonia y banquete, adultos y niños, menú y "algún dato de interés" (migración 0007). Solo la responsable de la boda y los administradores la editan (RLS). `dato_interes` es solo del equipo: el portal y María (ámbito novios) usan columnas explícitas y nunca lo leen. El titular 2 solo se guarda si tiene nombre.
- **D39 · Enlaces de novios:** un enlace personal por titular, sin contraseña. Se guarda solo la huella (sha256) del token, así que un enlace no se puede volver a mostrar: cada "Enviar" o "Copiar" crea uno nuevo y los anteriores siguen válidos; "Anular y crear uno nuevo" cierra todos los de ese titular. Caduca 30 días después de la boda (exige fecha en la ficha). Portal `/boda/[token]` de solo lectura, sin indexar y sin Referer. Enlace inválido o caducado: mensaje genérico. Se registra el último acceso y cuándo se envió por correo (migración 0008).

- **D40 · Avisos (correo, Resend, plantilla D37):** a los novios, un correo con botón "Ver respuesta" cuando el equipo o María responde y no están en el chat; se agrupa en un solo correo si llegan varias respuestas seguidas. Se avisa solo al titular que preguntó. Al equipo, un correo a la responsable (a los administradores si no hay) cuando hace falta una persona, además del contador "Te toca" en la bandeja; no hay correo cuando María resuelve sola. Recordatorio a las 4 horas a la responsable y a las 24 horas también a los administradores, siempre en horas naturales (sin distinguir laborables ni ciudades). WhatsApp queda para cuando exista ese canal.
- **D41 · Marca en los correos (revisa D37):** cabecera blanca solo con el logo de Guadalquivir Catering y una línea ámbar (sin texto de marca). Pie mínimo, sin datos de la empresa ni explicaciones: solo los enlaces a Aviso legal y Política de privacidad de la web, para no generar ruido. Se cuida la identidad de marca en todo lo que ven los novios.
- **D42 · Perfil de comercial:** cada comercial edita su foto (en círculo; sin foto, su inicial sobre ámbar) y una frase de presentación de hasta 140 caracteres, además de nombre, correo y teléfono. Lo ven los novios en la tarjeta "Vuestra comercial" de Mi boda, junto a sus mensajes en el chat y en los correos que reciben. Se publica al guardar, sin revisión previa; el administrador puede quitar una foto o frase. Nada se borra de verdad: quitar la foto la desactiva.

- **D43 · Chat de novios (primera versión):** en `/boda/[enlace]`, pestañas Chat y Mi boda. Un único hilo por boda (la conversación más antigua de la boda) donde escriben los dos titulares; los mensajes del equipo se ven por sondeo cada 8 s, sin tiempo real todavía. Solo texto: fotos y notas de voz quedan para después. María contesta con el ámbito novios (ficha sin dato de interés ni alergias, registrar cambio sin tocar la ficha). Si la conversación está en "humano" o cerrada, María no contesta: la conversación vuelve a "Te toca" y se avisa al equipo. El enlace viaja en la cabecera `x-boda-token`, no en la dirección de la API. Límite de 40 mensajes por hora por conversación. Los novios solo reciben mensajes de titulares, María y equipo; notas internas y avisos del sistema se filtran en el servidor.
- **D44 · Cómo salen los avisos (D40):** cola `avisos` (migración 0010, solo servidor). El correo al equipo sale al momento y uno solo mientras el equipo no conteste. El correo a los novios espera 3 minutos para juntar respuestas y no sale si el titular ya ha abierto el chat; lleva un enlace personal nuevo. Los recordatorios de 4 h y 24 h los genera el proceso periódico `/api/avisos`, que exige `Authorization: Bearer $CRON_SECRET` y debe llamarlo un programador externo cada pocos minutos.

- **D45 · Validar cambios de los novios:** María solo registra cambios sobre campos de la ficha (fecha, espacio, tipo de ceremonia, hora de ceremonia, hora del banquete, adultos, niños, menú) o "otro". La responsable de la boda y los administradores aprueban o rechazan desde la tarjeta "Cambios pedidos" del panel de la conversación, con una nota opcional para los novios. Al aprobar un campo de la ficha, se aplica sola; los "otro" no se aplican solos: los resuelve la comercial y aprueba para avisar. La decisión llega a los novios como mensaje de la comercial en el chat y con el correo de D40. La bandeja marca las conversaciones con cambios pendientes. La pestaña Pendientes global queda para la fase 3.

## Pendiente de diseñar
- Pantalla "Sin asignar" del administrador.
- Capa de privacidad y RGPD y encargo de tratamiento de datos entre la empresa e Iván.
- Banco de 30–50 preguntas reales con respuesta de los comerciales.
- Plan detallado del piloto (2 comerciales, unas 10 bodas).
