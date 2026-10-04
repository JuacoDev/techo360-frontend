import test from "node:test";
import assert from "node:assert/strict";
import {
  accionesDe,
  aplicarIntercambio,
  aplicarMensaje,
  conversacionBloqueada,
  estadoDe,
  etiquetaEstado,
  hayEnProceso,
  mensajeSinResolver,
  normalizarIntercambio,
  normalizarMensaje,
  normalizarMensajes,
  quitarMensaje,
} from "./estadosMensaje.js";

const u = (id, estado, extra = {}) => ({ id, rol: "usuario", contenido: `u${id}`, ...(estado === undefined ? {} : { estado }), ...extra });
const a = (id) => ({ id, rol: "asistente", contenido: `a${id}`, estado: "respondido" });

test("estado ausente (backend anterior a la migracion) = respondido", () => {
  assert.equal(estadoDe(u(1)), "respondido");
  assert.equal(estadoDe(undefined), "respondido");
  assert.deepEqual(normalizarMensaje(u(1)), { ...u(1), estado: "respondido", error_detalle: null });
});

test("normalizar no toca un mensaje que ya trae estado y detalle (misma referencia)", () => {
  const m = u(1, "error", { error_detalle: "x" });
  assert.equal(normalizarMensaje(m), m);
});

test("normalizar listas e intercambios; valores no objeto pasan tal cual", () => {
  assert.deepEqual(normalizarMensajes([u(1), a(2)]).map((m) => m.estado), ["respondido", "respondido"]);
  assert.equal(normalizarMensajes(undefined), undefined);
  const r = normalizarIntercambio({ mensaje_usuario: u(1), mensaje_asistente: { id: 2, rol: "asistente" } });
  assert.equal(r.mensaje_usuario.estado, "respondido");
  assert.equal(r.mensaje_asistente.estado, "respondido");
  assert.equal(normalizarMensaje(null), null);
});

test("bloqueo: pendiente, procesando, error y cancelado bloquean; respondido no", () => {
  for (const estado of ["pendiente", "procesando", "error", "cancelado"]) {
    assert.equal(conversacionBloqueada([u(1, "respondido"), a(2), u(3, estado)]), true, estado);
  }
  assert.equal(conversacionBloqueada([u(1, "respondido"), a(2)]), false);
  assert.equal(conversacionBloqueada([]), false);
  assert.equal(conversacionBloqueada(undefined), false);
  assert.equal(conversacionBloqueada([u(1), a(2)]), false); // sin estados (backend viejo)
});

test("bloqueo: solo cuentan los mensajes de usuario", () => {
  assert.equal(conversacionBloqueada([{ id: 1, rol: "asistente", estado: "error" }]), false);
});

test("mensajeSinResolver devuelve el mensaje", () => {
  assert.equal(mensajeSinResolver([u(1, "respondido"), a(2), u(3, "error")]).id, 3);
  assert.equal(mensajeSinResolver([u(1, "respondido")]), null);
});

test("sondeo: solo hay que preguntar mientras hay pendiente/procesando", () => {
  assert.equal(hayEnProceso([u(1, "procesando")]), true);
  assert.equal(hayEnProceso([u(1, "pendiente")]), true);
  assert.equal(hayEnProceso([u(1, "error"), u(2, "cancelado"), u(3, "respondido")]), false);
  assert.equal(hayEnProceso([]), false);
});

test("acciones por estado", () => {
  assert.deepEqual(accionesDe(u(1, "error")), { reintentar: true, cancelar: true, eliminar: true });
  assert.deepEqual(accionesDe(u(1, "cancelado")), { reintentar: true, cancelar: false, eliminar: true });
  assert.deepEqual(accionesDe(u(1, "procesando")), { reintentar: false, cancelar: true, eliminar: false });
  assert.deepEqual(accionesDe(u(1, "pendiente")), { reintentar: false, cancelar: true, eliminar: true });
  assert.deepEqual(accionesDe(u(1, "respondido")), { reintentar: false, cancelar: false, eliminar: false });
  assert.deepEqual(accionesDe(u(1)), { reintentar: false, cancelar: false, eliminar: false });
  assert.deepEqual(accionesDe(a(2)), { reintentar: false, cancelar: false, eliminar: false });
});

test("etiquetas: el error muestra el detalle del servidor o un texto por defecto", () => {
  assert.equal(etiquetaEstado(u(1, "procesando")), "Procesando…");
  assert.equal(etiquetaEstado(u(1, "pendiente")), "Enviando…");
  assert.equal(etiquetaEstado(u(1, "cancelado")), "Cancelado.");
  assert.equal(etiquetaEstado(u(1, "error", { error_detalle: "El asistente no respondió a tiempo." })), "El asistente no respondió a tiempo.");
  assert.equal(etiquetaEstado(u(1, "error")), "No se pudo obtener una respuesta.");
  assert.equal(etiquetaEstado(u(1, "respondido")), "");
});

test("aplicarMensaje: reemplaza por id o agrega, sin mutar", () => {
  const lista = [u(1, "respondido"), u(2, "error")];
  const nueva = aplicarMensaje(lista, u(2, "procesando"));
  assert.deepEqual(nueva.map((m) => m.estado), ["respondido", "procesando"]);
  assert.equal(lista[1].estado, "error");
  assert.equal(aplicarMensaje(lista, u(3, "pendiente")).length, 3);
  assert.equal(aplicarMensaje(lista, null), lista);
});

test("aplicarIntercambio: el usuario pasa a respondido y la respuesta se agrega UNA vez", () => {
  const lista = [u(1, "respondido"), a(2), u(3, "error")];
  const intercambio = { mensaje_usuario: u(3, "respondido"), mensaje_asistente: a(4) };
  const resultado = aplicarIntercambio(lista, intercambio);
  assert.deepEqual(resultado.map((m) => `${m.id}:${m.estado}`), ["1:respondido", "2:respondido", "3:respondido", "4:respondido"]);
  assert.equal(aplicarIntercambio(resultado, intercambio).length, 4); // idempotente
  assert.equal(conversacionBloqueada(resultado), false);
});

test("quitarMensaje desbloquea una conversacion", () => {
  const lista = [u(1, "respondido"), a(2), u(3, "error")];
  assert.equal(conversacionBloqueada(lista), true);
  const sin = quitarMensaje(lista, 3);
  assert.equal(conversacionBloqueada(sin), false);
  assert.equal(sin.length, 2);
});
