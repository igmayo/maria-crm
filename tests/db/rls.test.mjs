// Pruebas de las reglas de acceso. Cada caso corre en su propia transacción y se deshace.
import pg from "pg";

const U = {
  admin: "a0000000-0000-0000-0000-000000000001",
  marta: "a0000000-0000-0000-0000-000000000002",
  raul: "a0000000-0000-0000-0000-000000000003",
  carla: "a0000000-0000-0000-0000-000000000004",
  pablo: "a0000000-0000-0000-0000-000000000005",
  sergio: "a0000000-0000-0000-0000-000000000006",
};
const E1 = "e0000000-0000-0000-0000-000000000001";
const E2 = "e0000000-0000-0000-0000-000000000002";
const C1 = "c0000000-0000-0000-0000-000000000001";
const C2 = "c0000000-0000-0000-0000-000000000002";

const pool = new pg.Pool({ host: "127.0.0.1", port: Number(process.env.PGPORT ?? 54329), user: "postgres", database: "maria_test" });
let fallos = 0, total = 0;

async function como(usuario, fn) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("set local role authenticated");
    await c.query("select set_config('request.jwt.claim.sub', $1, true)", [U[usuario]]);
    return await fn((sql, p) => c.query(sql, p));
  } finally {
    await c.query("rollback").catch(() => {});
    c.release();
  }
}
async function cuenta(usuario, sql, p) {
  return como(usuario, async (q) => Number((await q(`select count(*)::int n from (${sql}) t`, p)).rows[0].n));
}
async function falla(usuario, sql, p) {
  try { await como(usuario, (q) => q(sql, p)); return false; } catch { return true; }
}
async function afecta(usuario, sql, p) {
  return como(usuario, async (q) => (await q(sql, p)).rowCount);
}
function ok(cond, nombre) {
  total++;
  if (cond) console.log("  ok  ", nombre);
  else { fallos++; console.log("  FALLA", nombre); }
}

console.log("Visibilidad (decisión 22)");
ok((await cuenta("admin", "select 1 from eventos")) === 3, "el administrador ve los 3 eventos");
ok((await cuenta("marta", "select 1 from eventos")) === 1, "Marta solo ve su boda");
ok((await cuenta("raul", "select 1 from eventos")) === 1, "Raúl solo ve su boda");
ok((await cuenta("marta", "select 1 from conversaciones")) === 1, "Marta solo ve su conversación");
ok((await cuenta("marta", "select 1 from mensajes where autor='nota_interna'")) === 1, "Marta ve la nota interna de su conversación");
ok((await cuenta("raul", "select 1 from mensajes where conversacion_id=$1", [C1])) === 0, "Raúl no ve mensajes de la conversación de Marta");
ok((await cuenta("pablo", "select 1 from eventos")) === 0, "Almacén sin compartir no ve eventos");
ok((await cuenta("pablo", "select 1 from conversaciones")) === 0, "Almacén sin compartir no ve conversaciones");
ok((await cuenta("sergio", "select 1 from eventos")) === 0, "Un usuario desactivado no ve nada");
ok((await cuenta("sergio", "select 1 from perfiles")) === 0, "Un usuario desactivado no ve ni perfiles");

console.log("Conversación compartida (diseño)");
ok((await cuenta("carla", "select 1 from conversaciones")) === 1, "Carla ve la conversación compartida");
ok((await cuenta("carla", "select 1 from eventos")) === 1, "Carla ve la boda de esa conversación");
ok((await cuenta("carla", "select 1 from conversaciones where id=$1", [C2])) === 0, "Carla no ve otras conversaciones");
ok(!(await falla("carla", "insert into mensajes (conversacion_id, autor, texto, usuario_id) values ($1,'nota_interna','hola',$2)", [C1, U.carla])), "Carla puede escribir una nota en la conversación compartida");
ok(await falla("carla", "insert into mensajes (conversacion_id, autor, texto, usuario_id) values ($1,'equipo','hola',$2)", [C2, U.carla]), "Carla no puede escribir en una conversación no compartida");
ok(await falla("carla", "insert into mensajes (conversacion_id, autor, texto, usuario_id) values ($1,'titular','suplanto',$2)", [C1, U.carla]), "Nadie del equipo puede escribir como titular");
ok(await falla("carla", "insert into mensajes (conversacion_id, autor, texto, usuario_id) values ($1,'equipo','hola',$2)", [C1, U.marta]), "No se puede escribir en nombre de otra persona");
ok(await falla("carla", "insert into conversacion_miembros (conversacion_id, usuario_id, permiso) values ($1,$2,'ver')", [C1, U.pablo]), "Carla no puede compartir la conversación (decisión 20)");
ok(!(await falla("marta", "insert into conversacion_miembros (conversacion_id, usuario_id, permiso) values ($1,$2,'ver')", [C1, U.pablo])), "La responsable sí puede compartirla");
ok(await falla("raul", "insert into conversacion_miembros (conversacion_id, usuario_id, permiso) values ($1,$2,'ver')", [C1, U.pablo]), "Un comercial ajeno no puede compartir conversaciones de otros");

console.log("Datos delicados y enlaces");
ok((await cuenta("marta", "select 1 from datos_salud")) === 1, "Marta ve las alergias de su boda");
ok((await cuenta("marta", "select 1 from datos_salud where evento_id=$1", [E2])) === 0, "Marta no ve las alergias de otra boda");
ok((await cuenta("carla", "select 1 from datos_salud")) === 0, "Carla (compartida) no ve alergias sin permiso explícito");
ok(await falla("marta", "select * from accesos"), "Un comercial no puede leer los enlaces de los novios");
ok(await falla("marta", "select * from codigos_verificacion"), "Un comercial no puede leer los códigos de verificación");

console.log("Perfiles y roles");
ok(await falla("marta", "update perfiles set rol='administrador' where id=$1", [U.marta]), "Nadie se sube el rol a sí mismo");
ok(!(await falla("marta", "update perfiles set telefono='600' where id=$1", [U.marta])), "Cada uno edita su teléfono");
ok((await afecta("marta", "update perfiles set nombre='X' where id=$1", [U.raul])) === 0, "No se edita el perfil de otro");
ok(!(await falla("admin", "update perfiles set rol='comercial' where id=$1", [U.pablo])), "El administrador cambia roles");

console.log("Búsqueda de bodas ajenas (solo quién la lleva)");
ok((await cuenta("marta", "select * from buscar_eventos('Carmen')")) === 1, "Marta encuentra la boda de Carmen");
const r = await como("marta", async (q) => (await q("select * from buscar_eventos('Carmen')")).rows[0]);
ok(r.responsable === "Raúl" && !("ficha" in r) && !("texto" in r), "La búsqueda solo devuelve quién la lleva, sin contenido");
ok((await cuenta("marta", "select 1 from eventos where id=$1", [E2])) === 0, "Aun así no puede abrir la boda ajena");
ok((await cuenta("marta", "select * from buscar_eventos('Ca')")) === 0, "La búsqueda exige al menos 3 letras");

console.log("Peticiones, pendientes y conocimiento");
ok((await afecta("marta", "update peticiones_cambio set estado='aprobada', validado_por=$1 where evento_id=$2", [U.marta, E1])) === 1, "Marta valida peticiones de su boda");
ok((await afecta("carla", "update peticiones_cambio set estado='aprobada' where evento_id=$1", [E1])) === 0, "Carla no valida peticiones");
ok(!(await falla("marta", "insert into pendientes (conversacion_id, tipo, descripcion) values ($1,'nota','x')", [C1])), "Marta crea pendientes en su conversación");
ok(await falla("raul", "insert into pendientes (conversacion_id, tipo, descripcion) values ($1,'nota','x')", [C1]), "Raúl no crea pendientes en la de Marta");
ok((await cuenta("marta", "select 1 from conocimiento")) === 1, "Marta ve solo lo publicado (no el borrador de Raúl)");
ok(!(await falla("marta", "insert into conocimiento (categoria,pregunta,respuesta,estado,autor_id) values ('Menús','p','r','propuesta',$1)", [U.marta])), "Un comercial puede proponer respuestas");
ok(await falla("marta", "insert into conocimiento (categoria,pregunta,respuesta,estado,autor_id) values ('Menús','p','r','publicada',$1)", [U.marta]), "Un comercial no puede publicar");
ok(!(await falla("admin", "insert into conocimiento (categoria,pregunta,respuesta,estado,autor_id) values ('Menús','p','r','publicada',$1)", [U.admin])), "El administrador sí publica");

console.log("Registros internos");
ok((await cuenta("marta", "select 1 from agente_ejecuciones")) === 0, "Un comercial no ve los registros del agente");
ok((await cuenta("admin", "select 1 from agente_ejecuciones")) === 1, "El administrador sí");

console.log("Creación");
ok(!(await falla("marta", "insert into eventos (tipo, responsable_id) values ('boda',$1)", [U.marta])), "Un comercial crea eventos a su nombre");
ok(await falla("marta", "insert into eventos (tipo, responsable_id) values ('boda',$1)", [U.raul]), "Un comercial no crea eventos a nombre de otro");
ok(await falla("carla", "insert into eventos (tipo, responsable_id) values ('boda',$1)", [U.carla]), "Diseño no crea eventos");

console.log("Alta de usuarios");
async function comoSuper(fn) {
  const c = await pool.connect();
  try { await c.query("begin"); return await fn((sql, p) => c.query(sql, p)); }
  finally { await c.query("rollback").catch(() => {}); c.release(); }
}
const nuevo = await comoSuper(async (q) => {
  await q("insert into auth.users (id, email) values ('b0000000-0000-0000-0000-000000000001','nueva@ejemplo.test')");
  return (await q("select rol, activo, nombre from perfiles where id='b0000000-0000-0000-0000-000000000001'")).rows[0];
});
ok(nuevo && nuevo.rol === "comercial" && nuevo.activo === false, "Un usuario nuevo nace como comercial desactivado");
const primero = await comoSuper(async (q) => {
  await q("update perfiles set rol='comercial' where rol='administrador'");
  await q("insert into auth.users (id, email) values ('b0000000-0000-0000-0000-000000000002','IGuerrero@sedee.io')");
  return (await q("select rol, activo from perfiles where id='b0000000-0000-0000-0000-000000000002'")).rows[0];
});
ok(primero && primero.rol === "administrador" && primero.activo === true, "El primer administrador se activa solo si aún no hay ninguno");
const segundo = await comoSuper(async (q) => {
  await q("insert into auth.users (id, email) values ('b0000000-0000-0000-0000-000000000003','iguerrero@sedee.io')");
  return (await q("select rol, activo from perfiles where id='b0000000-0000-0000-0000-000000000003'")).rows[0];
});
ok(segundo && segundo.rol === "comercial" && segundo.activo === false, "Si ya hay administrador, ese correo no se activa solo");

await pool.end();
console.log(`\n${total - fallos}/${total} correctas`);
process.exit(fallos ? 1 : 0);
