# techo360-frontend

App React de Techo 360.

<!-- Prueba de despliegue automatico: 2026-07-27 11:03:59 -->

<!-- Prueba 2 de despliegue: 2026-07-27 11:13:40 -->

<!-- Prueba 3 de despliegue: 2026-07-27 11:33:03 -->

## Estado en producción (`development`, 4–5-oct-2026)

Estado de `development` (lo que corre en producción) hasta el SHA `5621631`. La rama `Testing` está desfasada respecto a `development` (3 commits propios y 21 por detrás a 5-oct), por eso este README documenta `development`. Cada cambio se desplegó por separado y se revierte con `git revert -m 1 <SHA del merge>` y un nuevo deploy (push a `development`).

| Paso | PR | SHA del merge | SHA anterior | Qué cambia |
|---|---|---|---|---|
| D2 | #14 | `cc08143` | `67315f2` | Quita los `console.log` de depuración de la barra buscadora. |
| D3 | #15 | `2ef2a19` | `cc08143` | nginx: gzip para JSON, GeoJSON, JS y CSS. |
| D3b | #16 | `c02caee` | `2ef2a19` | nginx: `no-cache` en `index.html` e `immutable` en `/assets/`. |
| D3c | #18 | `1d15fd2` | `c02caee` | El panel no pide la serie proyectada fuera del modo proyección y muestra errores legibles (corrige el 422 de `/api/proyecciones/serie`). |
| D3d | #17 | `60a2a01` | `1d15fd2` | nginx: `/assets/` sin `always`, para que el 404 de un chunk viejo no lleve `immutable`. |
| D4 | #19 | `2cd800b` | `60a2a01` | Mapa con `preferCanvas` y sin marco de foco. |
| D7 | #20 | `20fa960` | `2cd800b` | La pantalla activa vive en la URL (hook `usePantallaEnUrl`, sin react-router). La ruta del chatbot es `/techobot`: `/chatbot` la redirige (301) el `location /chatbot/` de nginx. |
| D9 | #21 | `a50ca26` | `20fa960` | Estados de mensaje en TechoBot (ver abajo). |
| D12 | #22 | `5621631` | `a50ca26` | nginx: timeouts de 210 s en `/chatbot/mensajes`. |

Cifra de D3 (del comentario de `nginx.conf`, medida sobre la respuesta real en su momento; no se repitió el 5-oct): municipios 4.999 KB → ~1.264 KB y departamentos 141 KB → ~36 KB.

### TechoBot: estados de mensaje (D9)
- Cada mensaje de usuario tiene estado: `pendiente`, `procesando`, `respondido`, `error` o `cancelado`. Si el backend no manda estado, se trata como `respondido`.
- Un mensaje sin resolver (`error`, `cancelado`, `pendiente` o `procesando`) muestra los botones **Reintentar**, **Cancelar** y **Eliminar** (según el estado) y **bloquea el cuadro de texto** de esa conversación. Cancelado también bloquea. Esto ocurre aunque el interruptor del backend (`CHATBOT_BLOQUEO_PENDIENTES`) esté apagado, porque el estado viene de la base.
- Sondeo cada 4 s mientras haya un mensaje en proceso; se limpia al desmontar la pantalla. Si un 409 informa que el mensaje ya está `respondido`, se relee la conversación.
- Accesibilidad: botones con `aria-label` que nombra el mensaje, `aria-describedby` en el cuadro bloqueado y el foco vuelve al cuadro al desbloquearse.
- Pruebas: `node --test` (49 pruebas, 12 de estados) y verificación en navegador contra un servidor simulado (no versionada).

### nginx: timeouts por bloque (`nginx -T` en el contenedor, 5-oct)
| Bloque | connect | send | read |
|---|---|---|---|
| `/api/` | 200 s | 200 s | 200 s |
| `/chatbot/conversaciones` (envío) | 60 s (defecto) | 210 s | 210 s |
| `/chatbot/mensajes` (reintentar/cancelar/eliminar) | 60 s (defecto) | 210 s (desde D12) | 210 s (desde D12) |
| `/auth/`, `/otp/`, `/chatbot/send`, `/chatbot/` | 60 s (defecto) | 60 s (defecto) | 60 s (defecto) |

Globales: `keepalive_timeout 65`; `send_timeout` y `client_*_timeout` sin definir (60 s por defecto). El RPC del backend espera hasta 200 s, por eso los bloques que lo esperan están en 210 s.

### Política de caché
- `index.html` (y las rutas de la SPA): `Cache-Control: no-cache` (revalida con ETag).
- `/assets/`: `public, max-age=31536000, immutable`, sin `always` (un 404 no lo lleva).
- gzip activo (nivel 4, mínimo 1024 B, `gzip_proxied any`).
- `/api/zonas` la sirve el backend con `Cache-Control: private, no-cache`, ETag y 304 (ver el README del backend).

### Cliente HTTP
El frontend usa `fetch` (envoltura `fetchConSesion`) **sin timeout propio ni `AbortController`**; el límite lo ponen nginx y el backend.

### Medido y no verificado
- Recrear el contenedor del frontend dejó el puerto 80 inaccesible ~0,8–0,9 s (D12, medido desde dentro del VPS).
- No verificado: Reintentar con la cola ocupada y el posible 504 de nginx (D12 sube el timeout, pero el caso no se reprodujo); los proxies o firewalls fuera del VPS; el comportamiento de TechoBot en un navegador externo tras cada despliegue.
