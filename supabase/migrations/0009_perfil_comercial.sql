-- Perfil de comercial (D42): frase de presentación y bucket público de fotos.
-- perfiles.foto_url ya existía. Cada comercial edita lo suyo con la política perfiles_editar_propio;
-- el administrador puede quitar foto o frase con perfiles_admin. Las fotos se suben solo desde el servidor (clave de servicio).
alter table perfiles add column frase text check (frase is null or char_length(frase) <= 140);

-- En Supabase existe el esquema storage; en el Postgres de pruebas no, por eso la comprobación.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('fotos-comerciales', 'fotos-comerciales', true, 5242880, array['image/jpeg','image/png','image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;
