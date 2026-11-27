-- Enlaces de novios: registrar cuándo se envió el enlace por correo (para mostrarlo al equipo).
-- La tabla accesos sigue sin políticas: solo el servidor la toca (clave de servicio).
alter table accesos add column enviado_en timestamptz;
