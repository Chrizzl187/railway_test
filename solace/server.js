// Zero-dependency static file server for the Solace site.
// Works on Railway (and anywhere else): listens on $PORT, binds 0.0.0.0, serves this folder.
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
const COMPRESSIBLE = new Set([".html", ".css", ".js", ".json", ".svg", ".txt"]);
// Files that live next to the site but must never be served.
const PRIVATE = new Set(["server.js", "package.json", "package-lock.json", "dockerfile", "railway.json", "railpack.json"]);

const gzCache = new Map(); // key: file + mtime → gzipped Buffer

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "X-Content-Type-Options": "nosniff", ...headers });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method Not Allowed", { Allow: "GET, HEAD" });

  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://x").pathname); }
  catch { return send(res, 400, "Bad Request"); }

  if (pathname === "/health") return send(res, 200, "ok", { "Content-Type": "text/plain" });
  if (pathname.includes("\0")) return send(res, 400, "Bad Request");

  if (pathname.endsWith("/")) pathname += "index.html";
  const file = path.join(ROOT, path.normalize(pathname));
  const rel = path.relative(ROOT, file);
  const name = path.basename(file).toLowerCase();

  // no traversal outside ROOT, no dotfiles, no server/config files
  if (rel.startsWith("..") || path.isAbsolute(rel) || rel.split(path.sep).some(p => p.startsWith(".")) || PRIVATE.has(name)) {
    return send(res, 404, "Not Found", { "Content-Type": "text/plain" });
  }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, "Not Found", { "Content-Type": "text/plain" });

    const ext = path.extname(file).toLowerCase();
    const type = TYPES[ext] || "application/octet-stream";
    const etag = `W/"${st.size}-${Math.floor(st.mtimeMs)}"`;
    const headers = {
      "Content-Type": type,
      ETag: etag,
      "Last-Modified": st.mtime.toUTCString(),
      // HTML always revalidates; other assets (unhashed filenames) cache briefly.
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300",
      Vary: "Accept-Encoding",
    };
    if (req.headers["if-none-match"] === etag) return send(res, 304, null, headers);

    const wantsGzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers["accept-encoding"] || "");
    fs.readFile(file, (e, data) => {
      if (e) return send(res, 500, "Server Error", { "Content-Type": "text/plain" });
      if (wantsGzip) {
        const key = file + st.mtimeMs;
        let gz = gzCache.get(key);
        if (!gz) { gz = zlib.gzipSync(data); gzCache.set(key, gz); }
        headers["Content-Encoding"] = "gzip";
        headers["Content-Length"] = gz.length;
        return send(res, 200, req.method === "HEAD" ? null : gz, headers);
      }
      headers["Content-Length"] = data.length;
      send(res, 200, req.method === "HEAD" ? null : data, headers);
    });
  });
});

server.listen(PORT, "0.0.0.0", () => console.log(`Solace listening on http://0.0.0.0:${PORT}`));

// Railway sends SIGTERM on redeploy; close cleanly.
process.on("SIGTERM", () => server.close(() => process.exit(0)));
