-- Al insertar con RETURNING, Postgres aplica la regla de lectura a la fila nueva, y las funciones auxiliares
-- todavía no la ven. Se añade la comprobación directa del responsable (o del administrador) a las reglas de lectura.
drop policy eventos_ver on eventos;
create policy eventos_ver on eventos for select using (
  (usuario_activo() and (es_admin() or responsable_id = auth.uid())) or puede_ver_evento(id)
);

drop policy conv_ver on conversaciones;
create policy conv_ver on conversaciones for select using (
  (usuario_activo() and (es_admin() or responsable_id = auth.uid())) or puede_ver_conversacion(id)
);
