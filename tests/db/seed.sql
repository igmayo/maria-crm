-- Datos de prueba. Nunca se cargan en producción.
insert into auth.users (id, email) values
 ('a0000000-0000-0000-0000-000000000001','admin@ejemplo.test'),
 ('a0000000-0000-0000-0000-000000000002','marta@ejemplo.test'),
 ('a0000000-0000-0000-0000-000000000003','raul@ejemplo.test'),
 ('a0000000-0000-0000-0000-000000000004','carla@ejemplo.test'),
 ('a0000000-0000-0000-0000-000000000005','pablo@ejemplo.test'),
 ('a0000000-0000-0000-0000-000000000006','sergio@ejemplo.test');
insert into perfiles (id, nombre, email, rol, activo) values
 ('a0000000-0000-0000-0000-000000000001','Iván','admin@ejemplo.test','administrador',true),
 ('a0000000-0000-0000-0000-000000000002','Marta','marta@ejemplo.test','comercial',true),
 ('a0000000-0000-0000-0000-000000000003','Raúl','raul@ejemplo.test','comercial',true),
 ('a0000000-0000-0000-0000-000000000004','Carla','carla@ejemplo.test','diseno',true),
 ('a0000000-0000-0000-0000-000000000005','Pablo','pablo@ejemplo.test','almacen',true),
 ('a0000000-0000-0000-0000-000000000006','Sergio','sergio@ejemplo.test','comercial',false)
 on conflict (id) do update set nombre = excluded.nombre, rol = excluded.rol, activo = excluded.activo;

insert into eventos (id, tipo, estado, fecha, responsable_id, ficha) values
 ('e0000000-0000-0000-0000-000000000001','boda','cliente','2027-06-12','a0000000-0000-0000-0000-000000000002','{"cocktail":"19:30"}'),
 ('e0000000-0000-0000-0000-000000000002','boda','cliente','2027-09-04','a0000000-0000-0000-0000-000000000003','{"cocktail":"20:00"}'),
 ('e0000000-0000-0000-0000-000000000003','empresa','lead',null,null,'{}');
insert into contactos (evento_id, posicion, nombre, email) values
 ('e0000000-0000-0000-0000-000000000001',1,'Lucía','lucia@ejemplo.test'),
 ('e0000000-0000-0000-0000-000000000001',2,'Andrés','andres@ejemplo.test'),
 ('e0000000-0000-0000-0000-000000000002',1,'Carmen','carmen@ejemplo.test'),
 ('e0000000-0000-0000-0000-000000000002',2,'Pablo','pablo.c@ejemplo.test'),
 ('e0000000-0000-0000-0000-000000000003',1,'Sofía','sofia@ejemplo.test');
insert into conversaciones (id, evento_id, estado, responsable_id) values
 ('c0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','te_toca','a0000000-0000-0000-0000-000000000002'),
 ('c0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000002','maria','a0000000-0000-0000-0000-000000000003'),
 ('c0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000003','sin_asignar',null);
insert into conversacion_miembros (conversacion_id, usuario_id, permiso) values
 ('c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004','escribir');
insert into mensajes (conversacion_id, autor, texto, usuario_id) values
 ('c0000000-0000-0000-0000-000000000001','titular','¿Podemos cambiar el postre?', null),
 ('c0000000-0000-0000-0000-000000000001','maria','Lo paso a Marta.', null),
 ('c0000000-0000-0000-0000-000000000001','nota_interna','Carla, mira la foto.','a0000000-0000-0000-0000-000000000002'),
 ('c0000000-0000-0000-0000-000000000002','titular','Hola', null);
insert into datos_salud (evento_id, texto) values
 ('e0000000-0000-0000-0000-000000000001','Alergia a frutos secos'),
 ('e0000000-0000-0000-0000-000000000002','Menú vegetariano');
insert into accesos (contacto_id, token_hash, caduca_en)
 select id, 'hash-'||nombre, now() + interval '30 days' from contactos where nombre='Lucía';
insert into peticiones_cambio (evento_id, campo, valor_actual, valor_pedido) values
 ('e0000000-0000-0000-0000-000000000001','postre','tarta clásica','tarta de tres alturas');
insert into pendientes (conversacion_id, tipo, descripcion, asignado_a) values
 ('c0000000-0000-0000-0000-000000000001','cambio','Cambio de postre','a0000000-0000-0000-0000-000000000002');
insert into conocimiento (categoria, pregunta, respuesta, estado, autor_id) values
 ('Menús','¿Hacéis menú infantil?','Sí, consultad con el equipo.','publicada','a0000000-0000-0000-0000-000000000001'),
 ('Menús','Borrador de Raúl','…','borrador','a0000000-0000-0000-0000-000000000003');
insert into agente_ejecuciones (conversacion_id, modelo, version_prompt) values
 ('c0000000-0000-0000-0000-000000000001','prueba','v0');
