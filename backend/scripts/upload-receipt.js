// scripts/upload-receipt.js
// Usage:
//   node scripts/upload-receipt.js --file "C:\path\to\receipt.jpg" --token "<JWT>" [--base http://localhost:4000] [--route echo]
//
// Works from Git Bash, PowerShell, or cmd on Windows.

const fs = require("fs");
const path = require("path");
const { argv, env } = process;

function parseArgs() {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") args.file = argv[++i];
    else if (a === "--token") args.token = argv[++i];
    else if (a === "--base") args.base = argv[++i];
    else if (a === "--route") args.route = argv[++i];
    else if (a.startsWith("--")) {
      const [k, v] = a.split("=");
      args[k.replace(/^--/,"")] = v ?? argv[++i];
    }
  }
  return args;
}

// Normalize Windows + Git Bash paths to a real Windows path
function normalizeWinPath(p) {
  if (!p) return p;
  // Remove surrounding quotes if any
  p = p.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  // Git Bash style /c/Users/... -> C:\Users\...
  const m = p.match(/^\/([a-zA-Z])\/(.*)$/);
  if (m) return `${m[1].toUpperCase()}:\\${m[2].replace(/\//g, "\\")}`;
  // file:///C:/... -> C:\...
  if (/^file:\/\/\//i.test(p)) {
    const noScheme = p.replace(/^file:\/\//i, "");
    return noScheme.replace(/\//g, "\\");
  }
  // C:/... -> C:\...
  if (/^[a-zA-Z]:\//.test(p)) return p.replace(/\//g, "\\");
  return p; // already looks like Windows path
}

(async () => {
  try {
    const args = parseArgs();
    const fileArg = args.file || env.FILE;
    const token = args.token || env.TOKEN || env.BEARER || "";
    const base = (args.base || env.API_BASE || "http://localhost:4000").replace(/\/+$/,"");
    const route = (args.route || "echo").replace(/^\/+/, "");

    if (!fileArg) throw new Error("Missing --file <path-to-image>");
    if (!token) throw new Error("Missing --token <JWT> (or set TOKEN env)");

    const winPath = normalizeWinPath(fileArg);
    if (!fs.existsSync(winPath)) throw new Error(`File not found: ${winPath}`);

    const buf = fs.readFileSync(winPath);
    const filename = path.basename(winPath);
    const ext = path.extname(filename).toLowerCase();
    const mime =
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      ext === ".png" ? "image/png" :
      ext === ".webp" ? "image/webp" :
      ext === ".gif" ? "image/gif" :
      ext === ".bmp" ? "image/bmp" :
      ext === ".tif" || ext === ".tiff" ? "image/tiff" :
      "application/octet-stream";

    // Node’s Web FormData / Blob / fetch are available in Node 18+
    const blob = new Blob([buf], { type: mime });
    const form = new FormData();
    form.append("receipt", blob, filename); // field name your backend expects

    const url = `${base}/api/v1/receipts/${route}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });

    const text = await res.text();
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const payload = isJson ? JSON.parse(text) : text;

    if (!res.ok) {
      console.error("HTTP", res.status, res.statusText);
      console.error(payload);
      process.exitCode = 1;
      return;
    }

    console.log(payload);
  } catch (err) {
    console.error("Upload failed:", err.message);
    process.exitCode = 1;
  }
})();
