# María · CRM de conversaciones de Guadalquivir Catering

Versión de prueba. Un chat web, un CRM para el equipo y un portal privado para los novios, con una asistente de IA (María) que responde y convierte contactos en reuniones. WhatsApp llegará después, sin tocar el núcleo.

## Qué hay hoy (fase 0)

| Pieza | Dónde | Estado |
|---|---|---|
| Esquema de base de datos | `supabase/migrations/0001_esquema.sql` | Hecho |
| Reglas de acceso (quién ve qué) | `supabase/migrations/0002_seguridad.sql` | Hecho, 46 pruebas |
| Núcleo del agente | `src/lib/agent/` | Hecho, 14 pruebas |
| Pantallas (chat público, equipo, portal novios) | `src/app/` | Solo estructura |

## Comandos

```bash
npm install
npm run typecheck   # tipos
npm test            # pruebas del agente
npm run test:db     # pruebas de permisos contra un Postgres temporal (necesita Postgres 16 instalado)
npm run build       # compilación de producción
npm run dev         # servidor local
```

## Puesta en marcha en la nube (entorno de pruebas)

1. **Supabase** (cuenta del cliente, región UE): crear proyecto `maria-pruebas`. Aplicar en orden `0001_esquema.sql` y `0002_seguridad.sql` desde el editor SQL.
2. **Vercel** (cuenta de Iván): importar el repositorio y copiar las variables de `.env.example`.
3. **Claude API**: crear una clave en la consola de desarrolladores (no es la suscripción de Claude.ai) y ponerla en `ANTHROPIC_API_KEY`.
4. **Resend** (cuenta del cliente): clave en `RESEND_API_KEY` y dominio remitente verificado.

Producción es otro proyecto de Supabase y otro despliegue, con claves distintas (decisión 30). No se cargan datos reales hasta la fase 2.

## Reglas de seguridad que el código garantiza

- El agente solo recibe la conversación actual; en el chat público no recibe datos de ninguna boda.
- El permiso de cada herramienta se decide en código, no en el prompt. El agente no puede escribir en la ficha, ni ver alergias, ni notas internas, ni pagos.
- Los cambios de novios se registran como petición; los valida el comercial.
- El texto del cliente se trata como dato, nunca como instrucción.
- Si el modelo falla, la persona recibe un mensaje seguro y se avisa al equipo.
- Los enlaces de novios solo guardan su huella (hash), con caducidad y revocación.

## Pendiente

- Conexión real del agente con la base de datos (repositorio) y pantallas de la fase 1.
- Login del equipo, enlaces personales de novios, correos y plazos de 24/48 h.
- Banco de 30–50 preguntas reales de los comerciales para medir la calidad.
- Revisión legal: encargo de tratamiento de datos y política de privacidad.
