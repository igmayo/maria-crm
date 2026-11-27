-- Alta de usuarios: cada usuario de Auth tiene un perfil. Nadie entra sin que el administrador lo active.
-- Excepción de arranque: el primer administrador (solo si todavía no existe ninguno).
create or replace function crear_perfil_nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  hay_admin boolean;
  es_primero boolean;
begin
  select exists (select 1 from perfiles where rol = 'administrador') into hay_admin;
  es_primero := not hay_admin and lower(new.email) = 'iguerrero@sedee.io';
  insert into perfiles (id, nombre, email, rol, activo)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nombre', ''), split_part(new.email, '@', 1)),
    lower(new.email),
    case when es_primero then 'administrador'::rol_usuario else 'comercial'::rol_usuario end,
    es_primero
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger auth_usuario_nuevo after insert on auth.users
  for each row execute function crear_perfil_nuevo_usuario();

revoke execute on function crear_perfil_nuevo_usuario() from public, anon, authenticated;
