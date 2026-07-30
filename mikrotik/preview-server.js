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
//   para ver el estado de error: http://localhost:8010/?error=Usuario+o+clave+incorrectos
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
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

// Sustituye las variables de plantilla de MikroTik por valores de
// ejemplo, igual que haría el router al servir la página.
function mockMikrotikTemplate(html, errorMessage) {
  // Bloque condicional $(if error) ... $(endif)
  html = html.replace(/\$\(if error\)([\s\S]*?)\$\(endif\)/, (_, block) => {
    if (!errorMessage) return ""; // sin error: el router omitiría el bloque entero
    return block.replace(/\$\(error\)/g, errorMessage);
  });

  return html
    .replace(/\$\(link-login-only\)/g, "/mock-login")
    .replace(/\$\(link-orig-esc\)/g, "https://ejemplo.com/pagina-original")
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
  if (url.pathname === "/mock-login" && req.method === "POST") {
    readBody(req, (body) => {
      const params = new URLSearchParams(body);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <!doctype html><html lang="es"><meta charset="utf-8">
        <body style="font-family:sans-serif;max-width:560px;margin:60px auto;line-height:1.6">
          <h1>✅ Simulación de login MikroTik</h1>
          <p>Esto es lo que el <b>formulario oculto</b> (el que de verdad concede la red) envió al router:</p>
          <table border="1" cellpadding="8" style="border-collapse:collapse">
            <tr><td><b>username</b></td><td>${params.get("username") || "(vacío)"}</td></tr>
            <tr><td><b>dst</b> (a dónde redirige)</td><td>${params.get("dst") || "(vacío)"}</td></tr>
            <tr><td><b>popup</b></td><td>${params.get("popup") || "(vacío)"}</td></tr>
          </table>
          <p style="color:#57423a">En un MikroTik real, este POST lo recibe el router (no este script) y,
          si el perfil tiene Trial habilitado, concede la red y redirige a <code>dst</code>.</p>
          <p><a href="/">&larr; Volver al formulario</a></p>
        </body></html>
      `);
    });
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
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(mockMikrotikTemplate(html, errorMessage));
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
  console.log(`Para ver el estado de error: http://localhost:${PORT}/?error=Usuario+o+clave+incorrectos`);
  console.log("Ctrl+C para detener. Esto NO se sube al router, es solo para revisar el diseño.");
});
