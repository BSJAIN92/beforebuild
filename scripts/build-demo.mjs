import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
let ts; try { ts = require("typescript"); } catch { ts = require(path.join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript")); }
const root = path.resolve(import.meta.dirname, "..");
const names = ["model", "backend", "icons", "export", "demo", "ui"];
const modules = names.map(name => {
  const source = fs.readFileSync(path.join(root, "lib", name + ".ts"), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: true } }).outputText;
  return `${JSON.stringify('/lib/' + name)}:function(module,exports,require){\n${output}\n}`;
}).join(",\n");
const js = `(function(){"use strict";const modules={${modules}};const cache={};function load(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;const require=(ref)=>{if(!ref.startsWith('.'))throw new Error('Unsupported external module '+ref);let parts=id.split('/');parts.pop();for(const p of ref.split('/')){if(p==='..')parts.pop();else if(p!=='.')parts.push(p);}return load(parts.join('/'));};modules[id](module,module.exports,require);return module.exports;}load('/lib/ui').mountWorkspace(document.getElementById('app'),load('/lib/demo').createDemoBackend());})();`;
const css = fs.readFileSync(path.join(root, "app", "globals.css"), "utf8");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="BeforeBuild — get clear before you start building. Interactive local demo; no live AI or web research."><title>BeforeBuild · Think first. Build better.</title><style>${css}</style></head><body><div id="app"></div><noscript>This demo needs JavaScript enabled.</noscript><script>${js.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist", "beforebuild-demo.html"), html);
console.log(`Created standalone demo: ${path.join(root, "dist", "beforebuild-demo.html")} (${Math.round(Buffer.byteLength(html)/1024)} KB; no external requests)`);
