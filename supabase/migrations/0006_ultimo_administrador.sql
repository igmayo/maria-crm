-- Panel de usuarios: nunca puede quedar el sistema sin un administrador activo.
-- Cubre desactivarse a uno mismo, quitarse el rol o que otro administrador lo haga (decisión 26).
create or replace function proteger_ultimo_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.rol = 'administrador' and old.activo and (new.rol <> 'administrador' or not new.activo) then
    if not exists (select 1 from perfiles p where p.id <> old.id and p.rol = 'administrador' and p.activo) then
      raise exception 'Debe quedar al menos un administrador activo' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

create trigger perfiles_ultimo_admin before update on perfiles
  for each row execute function proteger_ultimo_admin();

revoke execute on function proteger_ultimo_admin() from public, anon, authenticated;
