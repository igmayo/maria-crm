-- Validar cambios (D45): nota opcional de la comercial para los novios al aprobar o rechazar.
-- La política pet_validar (solo la responsable de la boda y los administradores) ya cubre el UPDATE.
alter table peticiones_cambio add column nota text check (nota is null or char_length(nota) <= 500);
