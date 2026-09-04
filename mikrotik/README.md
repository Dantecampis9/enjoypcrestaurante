# Portal cautivo WiFi — Enjoy Punta Cana

Página de login del Hotspot de MikroTik: pide nombre, correo y teléfono antes de dar acceso a internet, y redirige a la web del restaurante.

**Esto NO es parte del sitio web.** Vive en el router, no en tu hosting. Nadie llega a este archivo por una URL normal — el MikroTik lo sirve automáticamente cuando un dispositivo se conecta al WiFi y todavía no está autenticado.

> ⚠️ **Si ya habías montado Supabase antes** (siguiendo `sql/README.md` del proyecto principal), necesitas ejecutar **`sql/05-add-phone.sql`** y **`sql/07-add-mikrotik-metadata.sql`** una vez en el SQL Editor de Supabase — añaden, respectivamente, la columna `telefono` y las columnas `mac`/`timestamp` a la tabla `leads`, que no existían cuando se creó el proyecto por primera vez. Si vas a montar Supabase desde cero, ignora esto: `01-schema.sql` y `02-rls.sql` ya incluyen las tres desde el principio.

---

## Cómo funciona (para que no sea una caja negra)

Hay **dos formularios** en `login.html`, y es importante no confundirlos:

1. **Formulario oculto** (`name="sendin"`) — es el que MikroTik reconoce. Envía `username = T-$(mac-esc)`, la convención estándar de RouterOS para un login de tipo **Trial**: acceso libre, sin usuario/contraseña reales. Este es el que de verdad abre la red.
   - Este archivo asume que el servidor Hotspot **no** usa CHAP (confirmado en Server Profiles: "HTTP CHAP" desmarcado, solo Cookie + Trial activos), así que no incluye `md5.js` ni el campo `$(chap-id)`. Si algún día se activa CHAP en el router, hay que volver a añadir ese soporte (un script que calcule `MD5(chap-id + password + chap-challenge)`) o el login fallará con `web browser did not send challenge response`.
2. **Formulario visible** (Nombre / Correo / Teléfono) — solo captura contactos para tu base de datos. No tiene ningún poder de conceder red por sí mismo.

Al pulsar **"Aceptar y Continuar"**: se valida nombre/correo/teléfono → se intenta guardar en Supabase (máx. 2.5 segundos) → **pase lo que pase con ese guardado** (éxito, fallo, sin internet) se envía el formulario oculto → MikroTik concede la red → redirige a `https://dantecampis9.github.io/enjoypcrestaurante/`.

Este orden es deliberado: un problema con Supabase (proyecto pausado, sin walled garden, etc.) **nunca** debe dejar a un cliente real sin WiFi.

---

## Requisitos en el router (hazlo en este orden)

### 1. Confirmar la versión de RouterOS

En Winbox o terminal:

```text
/system resource print
```

Las variables de plantilla usadas aquí (`$(link-login-only)`, `$(mac-esc)`, `$(popup)`, `$(error)`) son las clásicas del módulo Hotspot y funcionan igual en v6 y v7. Si tu router corre v7, no necesitas cambiar nada de este archivo.

### 2. Habilitar "Trial" en el Server Profile del Hotspot (no en el User Profile)

⚠️ **Corrección importante:** una versión anterior de este README decía que `trial-uptime-limit` se configura en **IP → Hotspot → User Profiles**. Es un error — esa propiedad vive en el **Server Profile** (`/ip hotspot profile`), no en el User Profile. `shared-users` sí es del User Profile; son menús distintos.

Primero confirma **cuál Server Profile usa tu servidor Hotspot real** (si tienes varios, como `hsprof1` y `default`, solo uno está activo):

```text
/ip hotspot print
```

Esto muestra la columna `profile=...` del hotspot activo. Edita **ese** perfil, no el que no se usa:

**IP → Hotspot → Server Profiles → (tu perfil) → pestaña "Login"**:

- **Login By**: marca **Trial** (y deja **Cookie** si ya lo tenías — sirve para que un visitante que vuelve no tenga que rellenar el formulario otra vez). **No marques HTTP CHAP** a menos que subas de nuevo `md5.js` y el soporte para CHAP que se quitó de `login.html` (ver nota en "Cómo funciona" arriba).
- **Trial Uptime Limit**: cuánto dura el acceso gratis antes de tener que aceptar de nuevo (ej. `30m` o `1h`).
- **Trial Uptime Reset**: cada cuánto se reinicia el contador por MAC (ej. `1d`).
- **Trial User Profile**: qué User Profile (límites de velocidad, sesión, etc.) aplica a los usuarios Trial — normalmente `default`.

Por terminal, sobre el perfil correcto (reemplaza `"default"` por el nombre real que confirmaste con `/ip hotspot print`):

```text
/ip hotspot profile set [find name="default"] login-by=trial,cookie trial-uptime-limit=30m trial-uptime-reset=1d trial-user-profile=default
```

Aparte, en **IP → Hotspot → User Profiles** (menú distinto) puedes ajustar cuántas sesiones simultáneas permite una misma cuenta:

```text
/ip hotspot user profile set [find name="default"] shared-users=1
```

> Si prefieres **no** usar Trial y ya tienes tu propio usuario/clave genérico de invitado, cambia en `login.html` el valor de `username` (y añade un `password`) por tus credenciales fijas, en vez de `T-$(mac-esc)`.

### 3. Añadir Supabase al Walled Garden **IP**

> ⚠️ Versiones anteriores de este documento indicaban aquí el menú `/ip hotspot walled-garden` (el de HTTP). **Ese no sirve para Supabase.** Filtra por nombre de dominio leyendo la cabecera `Host` de la petición, y en HTTPS esa cabecera va cifrada dentro del TLS: el router no puede leerla, la regla nunca coincide y el guardado falla en silencio.

El menú correcto es **`/ip hotspot walled-garden ip`**, que trabaja a nivel de IP/firewall — no inspecciona nada, así que el cifrado le da igual:

```text
/ip hotspot walled-garden ip
add action=accept dst-host=buxkahmxaubgygsbreze.supabase.co comment="Supabase - guardar contactos"
```

Al indicar `dst-host` con un nombre de dominio, RouterOS lo resuelve y **crea entradas dinámicas** con las IPs reales. Puedes verlas con `/ip hotspot walled-garden ip print`.

**Para comprobarlo:** desde un celular conectado al WiFi pero **sin haber pulsado el botón todavía**, abre `https://buxkahmxaubgygsbreze.supabase.co/rest/v1/`. Si devuelve texto JSON (aunque sea un error de Supabase), está pasando. Si sale el portal o se queda cargando, no.

**Este paso ya no es imprescindible**, pero sí recomendable. Supabase está detrás de Cloudflare y su API REST [no tiene IPs fijas](https://supabase.com/docs/guides/troubleshooting/why-supabase-edge-functions-cannot-provide-static-egress-ips-for-whitelisting-3d78b0), así que el día que roten la regla deja de coincidir. Por eso existe la vía de respaldo: cuando este guardado no se confirma, el contacto viaja en el fragmento (`#`) de la URL de destino y lo guarda el sitio web ya con internet (`js/lead-capture.js`). El detalle está en la cabecera de `login.html`.

### 4. Confirmar la carpeta del skin (`html-directory`)

Antes de subir nada, confirma en qué carpeta busca los archivos tu Server Profile (documentación oficial de MikroTik: esta propiedad vive en el **Server Profile**, con `hotspot` como valor por defecto):

```text
/ip hotspot profile print detail
```

Busca `html-directory=...` en el perfil que confirmaste en el paso 2 (normalmente `hotspot`).

### 5. Subir los archivos

RouterOS ya crea automáticamente, al configurar el Hotspot, un juego de archivos por defecto en esa carpeta (`alogin.html`, `error.html`, `logout.html`, `radvert.html`, `redirect.html`, `rlogin.html`, `status.html`, `errors.txt`, `logo.png`, `login.css`, etc.). **No los borres** — solo sube/reemplaza los nuestros encima, vía **Files** en Winbox o FTP:

```text
/hotspot/login.html
/hotspot/style.css
/hotspot/banner.jpg
/hotspot/fonts/playfair-display.woff2
/hotspot/fonts/hanken-grotesk.woff2
```

Como `login.html` referencia `style.css` (no `login.css`), el `login.css` por defecto del router queda simplemente sin usarse — no hace falta borrarlo. Si tu servidor Hotspot usa un skin con otro nombre de carpeta (no `hotspot` a secas, según lo que confirmaste arriba), copia estos archivos dentro de esa carpeta en vez de crear una nueva.

### 6. Destino final tras conectar

`login.html` ya apunta a la web publicada:

```html
<input type="hidden" name="dst" value="https://dantecampis9.github.io/enjoypcrestaurante/" />
```

Si más adelante el sitio se muda a un dominio propio (ej. `enjoypcrestaurante.com`), actualiza ese valor con la URL nueva.

---

## Verificación

1. Conecta un celular al WiFi del restaurante (o fuerza el estado "no autenticado" quitando el dispositivo de **IP → Hotspot → Active** si ya estaba conectado).
2. Debe abrirse esta página automáticamente (o al intentar entrar a cualquier web).
3. Sin llenar nada y sin poder cerrar la ventana → confirma que **no** hay forma de navegar sin pasar por el formulario.
4. Llena datos inválidos (ej. correo sin `@`, teléfono con letras o muy corto) → debe mostrar el error y no avanzar.
5. Llena datos válidos → pulsa **Aceptar y Continuar** → el botón cambia a "Conectando…" → en unos segundos debe redirigir a la web del restaurante y el dispositivo ya tener internet.
6. Entra al panel de administración del sitio (`admin.html`) → pestaña **Suscriptores** → el contacto debe aparecer con `origen = mikrotik-hotspot`.
7. **Idioma:** con el navegador/teléfono en inglés, la página debe abrir en inglés automáticamente. Pulsa **ES/EN** arriba del título → todo el texto (título, subtítulo, placeholders, botón, error, términos) debe cambiar de idioma al instante.
8. **Prueba de resiliencia:** quita temporalmente la regla del Walled Garden (paso 3) y repite el paso 5 — debe seguir concediendo WiFi igual (solo que sin guardar el contacto). Vuelve a añadir la regla al terminar la prueba.

---

## Si algo falla

| Síntoma | Causa habitual |
| --- | --- |
| La página no aparece al conectar al WiFi | El servidor Hotspot no está activo en esa interfaz, o el dispositivo ya estaba autenticado antes |
| Se ve sin estilos (texto plano) | `style.css`, `banner.jpg` o la carpeta `fonts/` no se subieron junto a `login.html`, o quedaron en una ruta distinta |
| Aparece `$(error)` en un recuadro rojo | Es un error real de RouterOS (ver el mensaje) — normalmente credenciales Trial mal configuradas o sesión ya activa |
| `invalid username or password` | El **Server Profile** (no el User Profile) no tiene "Trial" marcado en Login By (paso 2) — revisa que editaste el perfil correcto con `/ip hotspot print`, ya que puede haber varios Server Profiles y solo uno estar activo |
| `web browser did not send challenge response (try again, enable JavaScript)` | El servidor Hotspot pasó a usar CHAP (revisa Server Profiles → Login) y `login.html` ya no trae el soporte para eso — ver la nota en "Cómo funciona" arriba |
| Nunca concede la red tras pulsar el botón | El Server Profile no tiene Trial habilitado (paso 2), o el `html-directory` del perfil (paso 4) no coincide con la carpeta donde subiste los archivos |
| El botón se queda 3s en "Conectando…" siempre | Normal si Supabase no está en el Walled Garden (paso 3): agota el tiempo de espera y continúa igual |
| No llegan contactos a la pestaña Suscriptores | Revisa el Walled Garden (paso 3); confirma con la prueba del navegador: `fetch("https://buxkahmxaubgygsbreze.supabase.co/rest/v1/leads", {headers:{apikey:"..."}})` desde un dispositivo ya conectado |
