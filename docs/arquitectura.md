# Arquitectura del CRM con agente María · Guadalquivir Catering

Estado a 27/11/2026. Es un sistema a validar: se construye por fases, con una prueba piloto al final de cada una. Se usan herramientas que Iván ya conoce y se escala solo si hace falta.

## Piezas
| Pieza | Herramienta | Para qué |
|---|---|---|
| Aplicación web (panel del equipo, portal de novios, chat público) | Next.js en Vercel | Una sola base de código con tres superficies |
| Datos | Supabase (Postgres, región UE) | Conversaciones, bodas, leads, conocimiento |
| Permisos | Reglas de acceso por fila (RLS) de Supabase | Cada rol ve solo lo suyo, aunque falle la pantalla |
| Acceso del equipo | Supabase Auth, correo y contraseña | Roles |
| Acceso de novios | Enlace personal propio, sin contraseña | Una huella del enlace en la base de datos, con caducidad y anulación |
| Archivos | Supabase Storage privado | Fotos y audios con enlaces temporales |
| Chat en vivo, "está escribiendo", avisos | Supabase Realtime | |
| Plazos y reintentos | Vercel Cron / pg_cron | 24 h y 48 h, vuelta de María |
| Agente | API de Claude, llamada desde el servidor | Con herramientas limitadas |
| Correos | Resend | Enlaces, códigos, avisos |
| Errores y caídas | Sentry y un aviso de caída | |

## El agente María
- Recibe solo los datos de la conversación en curso. En el chat público no recibe datos de ninguna boda.
- Herramientas: buscar en la base de conocimiento, registrar una petición de cambio, crear un pendiente, guardar un lead, proponer día y hora de reunión, avisar al equipo.
- No tiene permiso de escritura sobre la ficha. Los cambios los valida siempre un comercial.
- No habla de pagos ni promete precios no publicados. Si no sabe, lo dice y crea un pendiente.
- Todo lo que escribe un cliente se trata como dato, nunca como instrucción. Los permisos se comprueban en el servidor, no en el texto del prompt.
- Cada ejecución queda registrada: modelo, versión del texto, herramientas usadas, coste y duración.
- Siempre se presenta como asistente de IA.

## Modelo de datos (resumen)
Ver `supabase/migrations/`. Tablas: `perfiles`, `eventos`, `contactos` (titulares 1 y 2), `accesos`, `codigos_verificacion`, `datos_salud` (alergias, permisos estrictos), `conversaciones`, `conversacion_miembros`, `mensajes` (autor: titular, maría, equipo, nota interna, sistema), `adjuntos`, `pendientes`, `peticiones_cambio`, `reuniones`, `conocimiento`, `agente_ejecuciones`, `consentimientos`, `registro_actividad`.

## Quién ve qué
- **Administrador:** todo.
- **Comercial:** sus conversaciones y las compartidas. Una búsqueda de bodas ajenas solo muestra quién la lleva, sin contenido.
- **Diseño, almacén y administración:** solo lo que se les comparta.
- **Novios:** no usan tablas directamente; entran por funciones del servidor que validan su enlace. Nunca reciben notas internas, y esto se filtra en el servidor.
- **Alergias y dietas:** solo tras código por correo (novios) o con permiso explícito (equipo).

## Entornos y calidad
- Desarrollo local, pruebas y producción. Los cambios de base de datos van versionados en `supabase/migrations/`.
- Secretos solo en las variables del servidor. Límite de mensajes y comprobación anti-bots en el chat público y en la recuperación de enlaces.

## Copias y RGPD
- Copia diaria automática del proveedor y copia semanal externa en una carpeta de Drive de la empresa. Prueba de restauración cada trimestre. Nada se borra definitivamente.
- Datos en región UE. Acuerdos de tratamiento de datos con cada proveedor. Aviso de privacidad y consentimiento en el chat. Plazos de conservación por definir.

## Titularidad de las cuentas (D29)
- **A nombre de Iván:** Claude (API), GitHub y Vercel.
- **A nombre del cliente:** Resend y Supabase.
- Los mensajes de los clientes pasan por la API de Claude y Vercel: conviene un contrato de encargo de tratamiento de datos entre la empresa y Iván, revisado por su asesor de protección de datos, antes de usar datos reales.
- Si Iván deja de mantener el sistema, hay que transferir GitHub, Vercel y la API de Claude a la empresa.

## Fases
0. **Fundamentos:** repositorio, entornos, acceso, esquema de datos, permisos, copias. (Hecho: esquema, permisos, núcleo del agente.)
1. **Leads:** login del equipo y bandeja (hecho), chat público con agente, lead estructurado, alta manual (hecho), panel de usuarios.
2. **Bodas:** fichas, los dos titulares, portal "Mi boda" y María con los datos de cada boda.
3. **Equipo completo:** compartir, notas internas, Hoy/Bandeja/Pendientes, escalado, usuarios.
4. **Robustez:** RGPD completo, métricas, integración en WordPress y WhatsApp.

Cada fase acaba con un piloto de 2 comerciales y unas 10 bodas, sin datos reales hasta la fase 2.

## Cómo se mide si funciona
- Porcentaje de consultas que María resuelve sin intervención humana.
- Tiempo hasta la primera respuesta.
- Leads estructurados por semana.
- Pendientes que llegan a escalarse.
- Calidad de las respuestas contra un banco de 30–50 preguntas reales de los comerciales (pendiente de recibir).

## Riesgos
- Respuestas incorrectas de la IA: base de conocimiento publicada por el administrador, "no sé" por defecto.
- Intentos de manipular a María desde el chat: permisos en el servidor.
- Fichas de boda a mano: riesgo de ficha desactualizada.
- WhatsApp: depende de resolver la API de Meta o un proveedor intermedio.
- Coste de la IA variable con el volumen: se registra cada ejecución.
