-- Avisos por correo (D40). Cola que solo toca el servidor (clave de servicio): sin políticas y sin permisos de usuario.
create type tipo_aviso as enum ('equipo_te_toca', 'novios_respuesta', 'recordatorio_4h', 'recordatorio_24h');

create table avisos (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_aviso not null,
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  contacto_id uuid references contactos(id),   -- a qué titular se avisa (solo novios_respuesta)
  mensaje_id uuid references mensajes(id),     -- mensaje que lo origina
  motivo text,
  creado_en timestamptz not null default now(),
  enviado_en timestamptz,
  descartado_en timestamptz                    -- no hacía falta enviarlo (ya lo vieron, ya se contestó...)
);
create index avisos_pendientes on avisos (tipo, creado_en) where enviado_en is null and descartado_en is null;
-- Un recordatorio por mensaje sin contestar y por plazo, aunque el proceso corra varias veces.
create unique index avisos_recordatorio_unico on avisos (conversacion_id, tipo, mensaje_id) where tipo in ('recordatorio_4h', 'recordatorio_24h');

alter table avisos enable row level security;
revoke all on avisos from anon, authenticated;
