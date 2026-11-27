-- Enseñar a María (D47): nota al devolver una propuesta, preguntas sin respuesta ya atendidas y control de versiones.

alter table conocimiento
  add column nota_revision text check (nota_revision is null or char_length(nota_revision) <= 500),
  add constraint conocimiento_largos check (
    char_length(pregunta) between 3 and 300 and char_length(respuesta) between 3 and 1500 and char_length(categoria) between 1 and 60
  );

-- La versión sube sola cuando cambia el contenido; nadie la toca a mano.
create or replace function conocimiento_version() returns trigger language plpgsql as $$
begin
  if new.pregunta is distinct from old.pregunta or new.respuesta is distinct from old.respuesta then
    new.version := old.version + 1;
  else
    new.version := old.version;
  end if;
  new.actualizado_en := now();
  return new;
end $$;
create trigger conocimiento_version before update on conocimiento for each row execute function conocimiento_version();

-- Una pregunta que María no supo responder se marca como enseñada o descartada ("no es para María"); no se borra.
alter table pendientes
  add column ensenado_en timestamptz,
  add column ensenado_como text check (ensenado_como is null or ensenado_como in ('ensenada','descartada'));
