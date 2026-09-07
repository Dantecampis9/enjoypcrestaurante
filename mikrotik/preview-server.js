// Servidor de vista previa LOCAL para mikrotik/login.html — SOLO para
// revisar el diseño en un navegador normal, sin necesitar un MikroTik real.
//
// NO se sube al router. NO modifica login.html: lo lee tal cual y solo
// sustituye, en memoria, las variables $(...) que normalmente pone
// RouterOS, con valores de ejemplo. El archivo real en el router seguirá
// usando sus propias variables sin que este script las toque.
//
// Uso:
//   node mikrotik/preview-server.js
//   abrir http://localhost:8010/
//   estado de error:     http://localhost:8010/?error=Usuario+o+clave+incorrectos
//   Trial ya consumido:  http://localhost:8010/?trial=no
//
// NOTA: login.html ya no soporta CHAP (se quitó md5.js porque el Server
// Profile del router usa Trial + Cookie, sin CHAP) — por eso este script
// tampoco simula ese modo.
//
// Requiere solo Node — sin dependencias, sin npm install.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = __dirname;
const PORT = 8010;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

// Sustituye las variables de plantilla de MikroTik por valores de
// ejemplo, igual que haría el router al servir la página.
//
// `trialDisponible` imita lo que decide el router: solo vale "yes" cuando
// ESE dispositivo todavía tiene tiempo de Trial. Con ?trial=no se ve el
// aviso de "ya usaste tu acceso de hoy" sin tener que agotarlo de verdad.
function mockMikrotikTemplate(html, errorMessage, trialDisponible) {
  // Bloque condicional del acceso Trial:
  //   (if trial == 'yes') formulario + botón (else) aviso (endif)
  html = html.replace(
    /\$\(if trial == 'yes'\)([\s\S]*?)\$\(else\)([\s\S]*?)\$\(endif\)/,
    (_, conTrial, sinTrial) => (trialDisponible ? conTrial : sinTrial)
  );

  // Bloque condicional $(if error) ... $(endif)
  html = html.replace(/\$\(if error\)([\s\S]*?)\$\(endif\)/, (_, block) => {
    if (!errorMessage) return ""; // sin error: el router omitiría el bloque entero
    return block.replace(/\$\(error\)/g, errorMessage);
  });

  return html
    .replace(/\$\(link-login-only\)/g, "/mock-login")
    .replace(/\$\(link-orig-esc\)/g, "https://ejemplo.com/pagina-original")
    .replace(/\$\(link-redirect\)/g, "/mock-redirect")
    .replace(/\$\(link-status\)/g, "/mock-status")
    .replace(/\$\(mac-esc\)/g, "AA-BB-CC-DD-EE-FF")
    .replace(/\$\(popup\)/g, "false");
}

function serveStatic(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("404 — no encontrado: " + filePath);
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

function readBody(req, cb) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => cb(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  // Simula el endpoint de autenticación de MikroTik ($(link-login-only)).
  // Solo muestra lo que el router habría recibido — no autentica nada de verdad.
  //
  // Acepta GET y POST: el botón "Aceptar y Continuar" es un enlace GET (el
  // patrón documentado por MikroTik para Trial), pero se deja el POST por si
  // alguna vez se vuelve a un formulario oculto.
  if (url.pathname === "/mock-login") {
    const responder = (params) => {
      const dst = params.get("dst") || "(vacío)";
      // Si el guardado en Supabase falló, login.html adjunta el contacto al
      // fragmento (#lead=...) para que lo rescate el sitio web ya con red.
      const frag = dst.includes("#lead=") ? dst.split("#lead=")[1] : null;
      let contacto = "";
      if (frag) {
        try {
          const json = decodeURIComponent(escape(Buffer.from(
            frag.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(frag.length / 4) * 4, "="),
            "base64").toString("binary")));
          contacto = `<tr><td><b>contacto en el fragmento</b></td><td><code>${json}</code></td></tr>`;
        } catch (e) {
          contacto = `<tr><td><b>fragmento</b></td><td>ilegible</td></tr>`;
        }
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <!doctype html><html lang="es"><meta charset="utf-8">
        <body style="font-family:sans-serif;max-width:640px;margin:60px auto;line-height:1.6">
          <h1>✅ Simulación de login MikroTik</h1>
          <p>Esto es lo que el enlace de acceso (el que de verdad concede la red) envió al router:</p>
          <table border="1" cellpadding="8" style="border-collapse:collapse">
            <tr><td><b>método</b></td><td>${req.method}</td></tr>
            <tr><td><b>username</b></td><td>${params.get("username") || "(vacío)"}</td></tr>
            <tr><td><b>dst</b> (a dónde redirige)</td><td>${dst}</td></tr>
            ${contacto}
          </table>
          <p style="color:#57423a">En un MikroTik real esta petición la recibe el router (no este script) y,
          si el perfil tiene Trial habilitado, concede la red y redirige a <code>dst</code>.</p>
          <p><a href="/">&larr; Volver al formulario</a></p>
        </body></html>
      `);
    };

    if (req.method === "POST") readBody(req, (body) => responder(new URLSearchParams(body)));
    else responder(url.searchParams);
    return;
  }

  // login.html con las variables $(...) sustituidas por valores de ejemplo
  if (url.pathname === "/" || url.pathname === "/login.html") {
    fs.readFile(path.join(ROOT, "login.html"), "utf8", (err, html) => {
      if (err) {
        res.writeHead(500);
        res.end("No se pudo leer login.html: " + err.message);
        return;
      }
      const errorMessage = url.searchParams.get("error");
      const trialDisponible = url.searchParams.get("trial") !== "no";
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(mockMikrotikTemplate(html, errorMessage, trialDisponible));
    });
    return;
  }

  // Todo lo demás (style.css, banner.jpg, fonts/...) se sirve tal cual
  const filePath = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("403");
    return;
  }
  serveStatic(filePath, res);
});

server.listen(PORT, () => {
  console.log(`Vista previa del portal cautivo en http://localhost:${PORT}/`);
  console.log(`Estado de error:    http://localhost:${PORT}/?error=Usuario+o+clave+incorrectos`);
  console.log(`Trial ya consumido: http://localhost:${PORT}/?trial=no`);
  console.log("Ctrl+C para detener. Esto NO se sube al router, es solo para revisar el diseño.");
});
