# Portal cautivo WiFi — Enjoy Punta Cana

Página de login del Hotspot de MikroTik: pide nombre y correo antes de dar acceso a internet, y redirige a la web del restaurante.

**Esto NO es parte del sitio web.** Vive en el router, no en tu hosting. Nadie llega a este archivo por una URL normal — el MikroTik lo sirve automáticamente cuando un dispositivo se conecta al WiFi y todavía no está autenticado.

---

## Cómo funciona (para que no sea una caja negra)

Hay **dos formularios** en `login.html`, y es importante no confundirlos:

1. **Formulario oculto** (`name="sendin"`) — es el que MikroTik reconoce. Envía `username = T-$(mac-esc)`, la convención estándar de RouterOS para un login de tipo **Trial**: acceso libre, sin usuario/contraseña reales. Este es el que de verdad abre la red.
2. **Formulario visible** (Nombre / Correo) — solo captura contactos para tu base de datos. No tiene ningún poder de conceder red por sí mismo.

Al pulsar **"Aceptar y Continuar"**: se valida el nombre/correo → se intenta guardar en Supabase (máx. 2.5 segundos) → **pase lo que pase con ese guardado** (éxito, fallo, sin internet) se envía el formulario oculto → MikroTik concede la red → redirige a `https://enjoypcrestaurante.com/`.

Este orden es deliberado: un problema con Supabase (proyecto pausado, sin walled garden, etc.) **nunca** debe dejar a un cliente real sin WiFi.

---

## Requisitos en el router (hazlo en este orden)

### 1. Confirmar la versión de RouterOS

En Winbox o terminal:

```
/system resource print
```

Las variables de plantilla usadas aquí (`$(link-login-only)`, `$(mac-esc)`, `$(popup)`, `$(error)`) son las clásicas del módulo Hotspot y funcionan igual en v6 y v7. Si tu router corre v7, no necesitas cambiar nada de este archivo.

### 2. Habilitar el login "Trial" en el perfil de usuario del Hotspot

**IP → Hotspot → User Profiles** → abre el perfil que usa tu servidor Hotspot → pestaña donde configuras el Trial:

```
/ip hotspot user profile set [find name="default"] shared-users=1
/ip hotspot user profile set [find name="default"] trial-uptime-limit=1h
```

(Ajusta `trial-uptime-limit` a lo que decidas — es cuánto dura la sesión antes de tener que aceptar de nuevo.)

> Si prefieres **no** usar Trial y ya tienes tu propio usuario/clave genérico de invitado, cambia en `login.html` el valor de `username` (y añade un `password`) por tus credenciales fijas, en vez de `T-$(mac-esc)`.

### 3. Añadir Supabase al Walled Garden

Sin esto, el `fetch()` del formulario nunca completa (el dispositivo no tiene internet todavía) y cada envío se resuelve como "fallo silencioso" — no rompe el acceso a la red, pero **tampoco vas a recibir ningún contacto**.

**IP → Hotspot → Walled Garden** → nueva entrada:

```
/ip hotspot walled-garden add dst-host=buxkahmxaubgygsbreze.supabase.co action=allow
```

### 4. Subir los archivos

Sube **toda la carpeta `mikrotik/`** (no solo `login.html`) a la carpeta del skin del Hotspot, normalmente vía **Files** en Winbox o FTP:

```
/hotspot/login.html
/hotspot/style.css
/hotspot/banner.jpg
/hotspot/fonts/playfair-display.woff2
/hotspot/fonts/hanken-grotesk.woff2
```

Si tu servidor Hotspot usa un skin con otro nombre de carpeta (no `hotspot` a secas), copia estos archivos dentro de esa carpeta en vez de crear una nueva.

### 5. Actualizar el destino final

En `login.html`, busca:

```html
<input type="hidden" name="dst" value="https://enjoypcrestaurante.com/" />
```

`enjoypcrestaurante.com` es un dominio de ejemplo usado en todo el proyecto (sitemap, robots.txt, etc.) — **reemplázalo por la URL real** una vez que el sitio esté publicado.

---

## Verificación

1. Conecta un celular al WiFi del restaurante (o fuerza el estado "no autenticado" quitando el dispositivo de **IP → Hotspot → Active** si ya estaba conectado).
2. Debe abrirse esta página automáticamente (o al intentar entrar a cualquier web).
3. Sin llenar nada y sin poder cerrar la ventana → confirma que **no** hay forma de navegar sin pasar por el formulario.
4. Llena nombre/correo inválido (ej. correo sin `@`) → debe mostrar el error y no avanzar.
5. Llena datos válidos → pulsa **Aceptar y Continuar** → el botón cambia a "Conectando…" → en unos segundos debe redirigir a la web del restaurante y el dispositivo ya tener internet.
6. Entra al panel de administración del sitio (`admin.html`) → pestaña **Suscriptores** → el contacto debe aparecer con `origen = mikrotik-hotspot`.
7. **Idioma:** con el navegador/teléfono en inglés, la página debe abrir en inglés automáticamente. Pulsa **ES/EN** arriba del título → todo el texto (título, subtítulo, placeholders, botón, error, términos) debe cambiar de idioma al instante.
8. **Prueba de resiliencia:** quita temporalmente la regla del Walled Garden (paso 3) y repite el paso 5 — debe seguir concediendo WiFi igual (solo que sin guardar el contacto). Vuelve a añadir la regla al terminar la prueba.

---

## Si algo falla

| Síntoma | Causa habitual |
|---|---|
| La página no aparece al conectar al WiFi | El servidor Hotspot no está activo en esa interfaz, o el dispositivo ya estaba autenticado antes |
| Se ve sin estilos (texto plano) | `style.css`, `banner.jpg` o la carpeta `fonts/` no se subieron junto a `login.html`, o quedaron en una ruta distinta |
| Aparece `$(error)` en un recuadro rojo | Es un error real de RouterOS (ver el mensaje) — normalmente credenciales Trial mal configuradas o sesión ya activa |
| Nunca concede la red tras pulsar el botón | El perfil de usuario del Hotspot no tiene Trial habilitado (paso 2) |
| El botón se queda 2.5s en "Conectando…" siempre | Normal si Supabase no está en el Walled Garden (paso 3): agota el tiempo de espera y continúa igual |
| No llegan contactos a la pestaña Suscriptores | Revisa el Walled Garden (paso 3); confirma con la prueba del navegador: `fetch("https://buxkahmxaubgygsbreze.supabase.co/rest/v1/leads", {headers:{apikey:"..."}})` desde un dispositivo ya conectado |
