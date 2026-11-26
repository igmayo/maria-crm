-- Reglas de acceso por fila (RLS). Decisiones: 22 (visibilidad), 20 (solo responsable/admin comparten), 26 (roles).

-- ---------- Funciones de apoyo (security definer para evitar recursión de reglas) ----------
create or replace function usuario_activo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles p where p.id = auth.uid() and p.activo);
$$;

create or replace function es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles p where p.id = auth.uid() and p.activo and p.rol = 'administrador');
$$;

create or replace function puede_ver_conversacion(conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select usuario_activo() and (
    es_admin()
    or exists (select 1 from conversaciones c where c.id = conv and c.responsable_id = auth.uid())
    or exists (select 1 from conversacion_miembros m where m.conversacion_id = conv and m.usuario_id = auth.uid())
  );
$$;

create or replace function puede_escribir_conversacion(conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select usuario_activo() and (
    es_admin()
    or exists (select 1 from conversaciones c where c.id = conv and c.responsable_id = auth.uid())
    or exists (select 1 from conversacion_miembros m
               where m.conversacion_id = conv and m.usuario_id = auth.uid() and m.permiso = 'escribir')
  );
$$;

create or replace function es_responsable_conversacion(conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select usuario_activo() and (
    es_admin()
    or exists (select 1 from conversaciones c where c.id = conv and c.responsable_id = auth.uid())
  );
$$;

create or replace function es_responsable_evento(ev uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select usuario_activo() and (
    es_admin()
    or exists (select 1 from eventos e where e.id = ev and e.responsable_id = auth.uid())
  );
$$;

create or replace function puede_ver_evento(ev uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select usuario_activo() and (
    es_admin()
    or exists (select 1 from eventos e where e.id = ev and e.responsable_id = auth.uid())
    or exists (select 1 from conversaciones c where c.evento_id = ev and puede_ver_conversacion(c.id))
  );
$$;

-- Búsqueda de bodas ajenas: solo devuelve quién la lleva, nunca contenido (decisión 22, opción b).
create or replace function buscar_eventos(q text)
returns table (evento_id uuid, titulares text, fecha date, tipo tipo_evento, responsable text)
language sql stable security definer set search_path = public as $$
  select e.id,
         (select string_agg(c.nombre, ' y ' order by c.posicion) from contactos c where c.evento_id = e.id),
         e.fecha, e.tipo, p.nombre
  from eventos e
  left join perfiles p on p.id = e.responsable_id
  where usuario_activo()
    and length(trim(coalesce(q,''))) >= 3
    and exists (select 1 from contactos c where c.evento_id = e.id and c.nombre ilike '%' || trim(q) || '%')
  limit 20;
$$;

-- ---------- Activar RLS en todo ----------
alter table perfiles enable row level security;
alter table eventos enable row level security;
alter table contactos enable row level security;
alter table accesos enable row level security;
alter table codigos_verificacion enable row level security;
alter table datos_salud enable row level security;
alter table conversaciones enable row level security;
alter table conversacion_miembros enable row level security;
alter table mensajes enable row level security;
alter table adjuntos enable row level security;
alter table pendientes enable row level security;
alter table peticiones_cambio enable row level security;
alter table reuniones enable row level security;
alter table conocimiento enable row level security;
alter table agente_ejecuciones enable row level security;
alter table consentimientos enable row level security;
alter table registro_actividad enable row level security;

-- ---------- Políticas ----------
-- perfiles: el equipo activo se ve entre sí (para compartir); cada uno edita lo suyo; el admin edita todo.
create policy perfiles_ver on perfiles for select using (usuario_activo());
create policy perfiles_editar_propio on perfiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy perfiles_admin on perfiles for all using (es_admin()) with check (es_admin());

-- Un usuario normal no puede cambiarse el rol ni reactivarse.
create or replace function proteger_perfil() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() and auth.uid() is not null then
    if new.rol is distinct from old.rol or new.activo is distinct from old.activo or new.email is distinct from old.email then
      raise exception 'Solo un administrador puede cambiar rol, estado o correo';
    end if;
  end if;
  return new;
end $$;
create trigger perfiles_proteger before update on perfiles for each row execute function proteger_perfil();

-- eventos
create policy eventos_ver on eventos for select using (puede_ver_evento(id));
create policy eventos_crear on eventos for insert with check (
  usuario_activo() and (es_admin() or (responsable_id = auth.uid() and
    exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'comercial')))
);
create policy eventos_editar on eventos for update using (es_responsable_evento(id)) with check (
  es_admin() or responsable_id = auth.uid()
);

-- contactos
create policy contactos_ver on contactos for select using (puede_ver_evento(evento_id));
create policy contactos_escribir on contactos for all using (es_responsable_evento(evento_id)) with check (es_responsable_evento(evento_id));

-- accesos y códigos: solo servidor (service role). Sin políticas = nadie con sesión de usuario.
-- datos_salud: solo administrador y responsable del evento.
create policy salud_ver on datos_salud for select using (es_responsable_evento(evento_id));
create policy salud_escribir on datos_salud for all using (es_responsable_evento(evento_id)) with check (es_responsable_evento(evento_id));

-- conversaciones
create policy conv_ver on conversaciones for select using (puede_ver_conversacion(id));
create policy conv_crear on conversaciones for insert with check (
  usuario_activo() and (es_admin() or (responsable_id = auth.uid() and es_responsable_evento(evento_id)))
);
create policy conv_editar on conversaciones for update using (es_responsable_conversacion(id)) with check (
  es_admin() or responsable_id = auth.uid()
);

-- miembros: solo responsable o admin comparten (decisión 20). Cada uno puede ver su propia fila.
create policy miembros_ver on conversacion_miembros for select using (puede_ver_conversacion(conversacion_id));
create policy miembros_gestionar on conversacion_miembros for all
  using (es_responsable_conversacion(conversacion_id)) with check (es_responsable_conversacion(conversacion_id));

-- mensajes: el equipo solo puede escribir como sí mismo y solo como equipo o nota interna. No se editan ni se borran.
create policy mensajes_ver on mensajes for select using (puede_ver_conversacion(conversacion_id));
create policy mensajes_escribir on mensajes for insert with check (
  puede_escribir_conversacion(conversacion_id)
  and autor in ('equipo','nota_interna')
  and usuario_id = auth.uid()
);

create policy adjuntos_ver on adjuntos for select using (
  exists (select 1 from mensajes m where m.id = mensaje_id and puede_ver_conversacion(m.conversacion_id))
);
create policy adjuntos_escribir on adjuntos for insert with check (
  exists (select 1 from mensajes m where m.id = mensaje_id and puede_escribir_conversacion(m.conversacion_id))
);

-- pendientes
create policy pend_ver on pendientes for select using (puede_ver_conversacion(conversacion_id));
create policy pend_crear on pendientes for insert with check (puede_escribir_conversacion(conversacion_id));
create policy pend_editar on pendientes for update using (
  asignado_a = auth.uid() or es_responsable_conversacion(conversacion_id)
);

-- peticiones de cambio: ven los que ven el evento; validan solo responsable o admin.
create policy pet_ver on peticiones_cambio for select using (puede_ver_evento(evento_id));
create policy pet_validar on peticiones_cambio for update using (es_responsable_evento(evento_id)) with check (es_responsable_evento(evento_id));

-- reuniones
create policy reu_ver on reuniones for select using (puede_ver_evento(evento_id));
create policy reu_gestionar on reuniones for all using (es_responsable_evento(evento_id)) with check (es_responsable_evento(evento_id));

-- conocimiento: todos ven lo publicado; cada uno ve lo suyo; solo el admin publica.
create policy con_ver on conocimiento for select using (
  usuario_activo() and (estado = 'publicada' or autor_id = auth.uid() or es_admin())
);
create policy con_proponer on conocimiento for insert with check (
  usuario_activo() and (es_admin() or (autor_id = auth.uid() and estado in ('borrador','propuesta')))
);
create policy con_editar on conocimiento for update using (
  es_admin() or (autor_id = auth.uid() and estado in ('borrador','propuesta'))
) with check (
  es_admin() or (autor_id = auth.uid() and estado in ('borrador','propuesta'))
);

-- registros internos: solo el administrador los lee; las escrituras las hace el servidor.
create policy ejec_admin on agente_ejecuciones for select using (es_admin());
create policy cons_admin on consentimientos for select using (es_admin());
create policy act_admin on registro_actividad for select using (es_admin());

-- ---------- Permisos a nivel de tabla ----------
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant usage on schema public to authenticated;
grant select on perfiles, eventos, contactos, datos_salud, conversaciones, conversacion_miembros, mensajes,
      adjuntos, pendientes, peticiones_cambio, reuniones, conocimiento, agente_ejecuciones,
      consentimientos, registro_actividad to authenticated;
grant insert, update on eventos, contactos, conversaciones, pendientes, reuniones, conocimiento to authenticated;
grant update on perfiles, peticiones_cambio to authenticated;
grant insert, update, delete on datos_salud, conversacion_miembros to authenticated;
grant insert on mensajes, adjuntos to authenticated;
grant execute on function buscar_eventos(text) to authenticated;
