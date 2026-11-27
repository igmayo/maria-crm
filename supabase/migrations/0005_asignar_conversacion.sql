-- Asignar o reasignar una conversación (decisión "Asignación": solo el administrador).
-- Cambia a la vez el responsable de la boda y de sus conversaciones, para que no queden desacordes.
-- La conversación pasa a "te_toca" para el nuevo responsable, salvo que esté cerrada (sigue cerrada).
-- Se ejecuta con los permisos de quien llama, así que las reglas de acceso siguen mandando.
create or replace function asignar_conversacion(conv uuid, comercial uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare ev uuid;
begin
  if not es_admin() then
    raise exception 'Solo el administrador asigna conversaciones' using errcode = '42501';
  end if;
  if not exists (select 1 from perfiles p where p.id = comercial and p.rol = 'comercial' and p.activo) then
    raise exception 'El responsable debe ser un comercial activo' using errcode = '22023';
  end if;
  select c.evento_id into ev from conversaciones c where c.id = conv;
  if not found then
    raise exception 'Conversación no encontrada' using errcode = 'P0002';
  end if;
  update eventos set responsable_id = comercial where id = ev;
  update conversaciones set responsable_id = comercial where evento_id = ev and id <> conv;
  update conversaciones
     set responsable_id = comercial,
         estado = case when estado = 'cerrada' then estado else 'te_toca' end,
         ultima_actividad = now()
   where id = conv;
end $$;

revoke execute on function asignar_conversacion(uuid, uuid) from public, anon;
grant execute on function asignar_conversacion(uuid, uuid) to authenticated;
