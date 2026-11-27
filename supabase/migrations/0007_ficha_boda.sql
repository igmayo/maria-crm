-- Ficha de boda editable: datos que el equipo rellena a mano (no hay exportación desde Parker).
-- Los edita la responsable o un administrador (política eventos_editar, ya existente).
-- Todo menos dato_interes lo ven los novios en "Mi boda". dato_interes es SOLO del equipo:
-- el portal de novios y María (ámbito novios) deben elegir columnas explícitas y nunca leerlo.
alter table eventos
  add column tipo_ceremonia text check (tipo_ceremonia in ('religiosa', 'civil')),
  add column hora_ceremonia time,
  add column hora_banquete time,
  add column adultos integer check (adultos is null or adultos >= 0),
  add column ninos integer check (ninos is null or ninos >= 0),
  add column menu text check (menu is null or char_length(menu) <= 1000),
  add column dato_interes text check (dato_interes is null or char_length(dato_interes) <= 2000);

comment on column eventos.dato_interes is 'Solo equipo. Nunca se muestra a los novios ni a María en el ámbito novios.';
