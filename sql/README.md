# Instalación del panel de administración

Guía para conectar el sitio a Supabase. Se hace **una sola vez**, en orden.

Al terminar tendrás: login real en `admin.html`, menú, eventos y galería (fotos y video) editables desde el navegador, y los correos de los suscriptores guardándose de verdad.

> **¿Ya tienes un proyecto Supabase montado con una versión anterior de este sitio?** Los pasos 1-6 de abajo son para una instalación **desde cero**. Si ya corriste `01-04` antes, en vez de repetirlos ejecuta solo las migraciones nuevas que falten, en orden: `sql/05-add-phone.sql` (teléfono en suscriptores) y `sql/06-add-gallery.sql` (galería con fotos y video). Cada una es idempotente — no duplica nada si ya la corriste.

---

## Antes de empezar

Ten a mano el correo y la contraseña que quieres usar para entrar al panel.

---

## 1. Crear el proyecto en Supabase

1. Entra en [supabase.com](https://supabase.com) y crea una cuenta (el plan gratuito sobra para este sitio).
2. **New project**. Ponle un nombre (ej. `enjoy-pc-restaurante`) y elige una región cercana: **East US** es la más próxima a República Dominicana.
3. Guarda la contraseña de la base de datos que te pide — no la necesitarás para esto, pero perderla es un fastidio.
4. Espera 1-2 minutos a que el proyecto termine de crearse.

## 2. Copiar las credenciales

Ve a **Settings → API** y copia dos cosas:

| Campo en Supabase | Dónde va |
| --- | --- |
| **Project URL** | `js/supabase-config.js` → `url` |
| Clave **`anon` / `public`** | `js/supabase-config.js` → `anonKey` |

> ### ⚠️ No copies la clave `service_role`
>
> En esa misma pantalla aparece una segunda clave llamada `service_role` (o `sb_secret_...`). **Esa nunca debe salir del dashboard de Supabase.**
>
> Ignora por completo todas las reglas de seguridad de la base de datos: quien la tenga puede leer todos los correos de tus suscriptores, borrar el menú entero y crear administradores.
>
> El archivo `js/supabase-config.js` lo descarga **cualquier visitante del sitio**. La clave `anon` está diseñada para eso y no es un problema; la `service_role` sería una filtración grave.

## 3. Crear las tablas

Ve a **SQL Editor → New query**, pega el contenido de cada archivo y pulsa **Run**, en este orden:

1. `sql/01-schema.sql` — crea las tablas
2. `sql/02-rls.sql` — **activa la seguridad** (no te lo saltes)
3. `sql/03-storage.sql` — prepara el almacén de fotos y video (hasta 50 MB por archivo)
4. `sql/04-seed.sql` — carga los 21 platos, 7 eventos y 18 fotos de galería actuales

### Comprobación obligatoria tras el paso 2

Ve a **Database → Tables**. Las 6 tablas (`admins`, `menu_categories`, `menu_items`, `events_weekly`, `leads`, `gallery_items`) deben mostrar el candado **"RLS enabled"**.

Si alguna no lo tiene, **para aquí y arréglalo**. Sin RLS, cualquiera en internet podría leer los correos de tus suscriptores o borrarte el menú.

## 4. Crear tu usuario de administrador

1. **Authentication → Providers → Email**: desactiva **"Allow new users to sign up"**.
   Así nadie puede registrarse por su cuenta; los administradores los creas tú.

2. **Authentication → Users → Add user**:
   - Email: tu correo
   - Password: tu contraseña
   - Marca **"Auto Confirm User"** (si no, quedará pendiente de verificación)

3. **SQL Editor**, sustituyendo el correo:

   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users
   where email = 'TU_CORREO_AQUI';
   ```

   Estar registrado en Supabase **no basta** para entrar al panel: hay que estar en esta tabla `admins`.

## 5. Revisar el aviso de seguridad

**Database → Advisors → Security**. No debe quedar ningún aviso del tipo *"RLS disabled in public"* ni *"policy allows anonymous access"* sobre `leads`.

## 6. Probar

Sirve el sitio y abre `admin.html`:

```bash
python -m http.server 8000
```

- Sin sesión → debe salir la pantalla de login.
- Con tu usuario → debe cargar el panel con los 21 platos, 7 eventos y 18 fotos de galería.

---

## Comprobaciones de seguridad recomendadas

Vale la pena hacerlas una vez, sobre todo la primera.

**1. Que la `service_role` no esté en el proyecto:**

```bash
grep -ri "service_role" . --exclude-dir=.git
grep -ri "sb_secret" . --exclude-dir=.git
```

Ambos deben devolver **cero resultados** (salvo las menciones en documentación y comentarios).

**2. Que nadie pueda leer los correos.** En una ventana de incógnito, sin sesión, abre la consola del navegador y ejecuta (con tus valores):

```js
fetch("https://TU-PROYECTO.supabase.co/rest/v1/leads", {
  headers: { apikey: "TU_ANON_KEY", Authorization: "Bearer TU_ANON_KEY" }
}).then(r => console.log(r.status));
```

Debe devolver **401** o **403**. Si devuelve 200 con datos, las políticas RLS no se aplicaron: vuelve al paso 3.

---

## Cómo funciona a partir de ahora

- **El sitio público no depende de Supabase para verse.** Pinta primero con los datos locales de `js/menu-data.js`, `js/events-data.js` y `js/gallery-data.js`, y luego los actualiza si la base responde. Sin internet, sigue funcionando con los datos locales.
- **Tras hacer cambios en el panel**, usa el botón **"Exportar respaldo JS"** y sustituye esos tres archivos en la carpeta `js/`. Así quien visite el sitio sin conexión también ve el menú, eventos y galería actualizados.
- **El plan gratuito pausa el proyecto** tras ~7 días sin ninguna actividad. El sitio seguiría funcionando con los datos locales, pero el panel no. Se reactiva desde el dashboard de Supabase.

## Si algo falla

| Síntoma | Causa habitual |
| --- | --- |
| "Falta configurar Supabase" al abrir el panel | `js/supabase-config.js` está vacío (paso 2) |
| "Esta cuenta no tiene permisos de administrador" | Falta el `insert into public.admins` (paso 4.3) |
| Los cambios no se ven en el sitio público | El plato/evento está marcado como no visible, o el navegador tiene caché: recarga con Ctrl+F5 |
| Los suscriptores no se guardan | Revisa que `sql/02-rls.sql` se ejecutó completo |
| El panel carga vacío | Falta ejecutar `sql/04-seed.sql` (paso 3.4) |
