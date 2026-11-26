-- María CRM · esquema base. Nombres en español. Nada se borra de verdad: se desactiva o se cierra.

create type rol_usuario as enum ('administrador','comercial','diseno','almacen','administracion');
create type tipo_evento as enum ('boda','empresa','otro');
create type estado_evento as enum ('lead','reunion','cliente','cerrado','perdido');
create type canal_conversacion as enum ('web','whatsapp','correo','manual');
create type estado_conversacion as enum ('maria','te_toca','humano','cerrada','sin_asignar');
create type autor_tipo as enum ('titular','maria','equipo','nota_interna','sistema');
create type permiso_miembro as enum ('escribir','ver');
create type tipo_pendiente as enum ('cambio','audio_foto','pregunta_maria','reunion','nota');
create type estado_peticion as enum ('pendiente','aprobada','rechazada');
create type estado_conocimiento as enum ('borrador','propuesta','publicada');
create type tipo_adjunto as enum ('foto','audio');

create table perfiles (
  id uuid primary key references auth.users(id) on delete restrict,
  nombre text not null,
  email text not null unique,
  telefono text,
  foto_url text,
  rol rol_usuario not null default 'comercial',
  activo boolean not null default true,
  alertas_email boolean not null default true,
  creado_en timestamptz not null default now()
);

create table eventos (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_evento not null,
  estado estado_evento not null default 'lead',
  fecha date,
  lugar text,
  invitados integer check (invitados is null or invitados >= 0),
  presupuesto_rango text,
  origen text,
  responsable_id uuid references perfiles(id),
  -- Datos de la ficha de boda que María puede consultar (claves permitidas en la app).
  ficha jsonb not null default '{}'::jsonb,
  creado_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index on eventos (responsable_id);

create table contactos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  posicion smallint not null check (posicion in (1,2)),
  nombre text not null,
  email text,
  telefono text,
  unique (evento_id, posicion)
);

-- Enlaces personales de los titulares. Solo se guarda la huella (hash) del enlace.
create table accesos (
  id uuid primary key default gen_random_uuid(),
  contacto_id uuid not null references contactos(id) on delete cascade,
  token_hash text not null unique,
  caduca_en timestamptz not null,
  revocado_en timestamptz,
  ultimo_uso timestamptz,
  creado_en timestamptz not null default now()
);
create index on accesos (contacto_id);

create table codigos_verificacion (
  id uuid primary key default gen_random_uuid(),
  acceso_id uuid not null references accesos(id) on delete cascade,
  codigo_hash text not null,
  caduca_en timestamptz not null,
  usado_en timestamptz,
  intentos smallint not null default 0
);

-- Alergias y dietas: tabla aparte, con permisos más estrictos.
create table datos_salud (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  contacto_id uuid references contactos(id) on delete set null,
  texto text not null,
  actualizado_en timestamptz not null default now()
);
create index on datos_salud (evento_id);

create table conversaciones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  canal canal_conversacion not null default 'web',
  estado estado_conversacion not null default 'maria',
  responsable_id uuid references perfiles(id),
  maria_pausada_hasta timestamptz,
  ultima_actividad timestamptz not null default now(),
  creado_en timestamptz not null default now()
);
create index on conversaciones (evento_id);
create index on conversaciones (responsable_id);
create index on conversaciones (estado);

create table conversacion_miembros (
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  usuario_id uuid not null references perfiles(id) on delete cascade,
  permiso permiso_miembro not null default 'ver',
  anadido_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  primary key (conversacion_id, usuario_id)
);

create table mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  autor autor_tipo not null,
  contacto_id uuid references contactos(id),   -- qué titular escribe
  usuario_id uuid references perfiles(id),     -- qué persona del equipo escribe
  texto text,
  creado_en timestamptz not null default now(),
  check (autor not in ('equipo','nota_interna') or usuario_id is not null)
);
create index on mensajes (conversacion_id, creado_en);

create table adjuntos (
  id uuid primary key default gen_random_uuid(),
  mensaje_id uuid not null references mensajes(id) on delete cascade,
  tipo tipo_adjunto not null,
  ruta text not null,
  bytes integer,
  creado_en timestamptz not null default now()
);

create table pendientes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  tipo tipo_pendiente not null,
  descripcion text,
  asignado_a uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  vence_en timestamptz,
  escalado_en timestamptz,
  resuelto_en timestamptz
);
create index on pendientes (asignado_a) where resuelto_en is null;

create table peticiones_cambio (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  contacto_id uuid references contactos(id),
  campo text not null,
  valor_actual text,
  valor_pedido text not null,
  estado estado_peticion not null default 'pendiente',
  validado_por uuid references perfiles(id),
  validado_en timestamptz,
  creado_en timestamptz not null default now()
);

create table reuniones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  preferencia text,
  comercial_id uuid references perfiles(id),
  confirmada_en timestamptz,
  creado_en timestamptz not null default now()
);

create table conocimiento (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  pregunta text not null,
  respuesta text not null,
  estado estado_conocimiento not null default 'borrador',
  autor_id uuid references perfiles(id),
  publicado_por uuid references perfiles(id),
  version integer not null default 1,
  actualizado_en timestamptz not null default now()
);
create index on conocimiento (estado, categoria);

create table agente_ejecuciones (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid references conversaciones(id) on delete set null,
  modelo text not null,
  version_prompt text not null,
  herramientas jsonb not null default '[]'::jsonb,
  tokens_entrada integer,
  tokens_salida integer,
  duracion_ms integer,
  creado_en timestamptz not null default now()
);

create table consentimientos (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid references conversaciones(id) on delete set null,
  texto_version text not null,
  aceptado_en timestamptz not null default now()
);

create table registro_actividad (
  id bigserial primary key,
  usuario_id uuid references perfiles(id),
  accion text not null,
  entidad text not null,
  entidad_id uuid,
  detalle jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);
