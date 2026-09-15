import { spawnSync, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
process.chdir(root);
const require = createRequire(import.meta.url);
let tsPath;
try { tsPath = require.resolve("typescript"); }
catch { tsPath = path.join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "typescript", "lib", "typescript.js"); }
const ts = require(tsPath);
const compile = spawnSync(process.execPath, [path.join(path.dirname(tsPath), "tsc.js"), "-p", "tsconfig.core.json"], { stdio: "inherit" });
if (compile.status) process.exit(compile.status);
let checked = 0;
function check(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".test-build", "dist", ".git"].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) check(file);
    else if (/\.tsx?$/.test(file) && !/\.d\.ts$/.test(file)) {
      const result = ts.transpileModule(fs.readFileSync(file, "utf8"), { fileName: file, reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, isolatedModules: true } });
      const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
      if (errors.length) { console.error(ts.formatDiagnosticsWithColorAndContext(errors, { getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => "\n" })); process.exit(1); }
      checked++;
      if (["providers.ts", "gemini.ts", "providerContext.ts"].some(name => file.endsWith(path.join("convex", name)))) {
        fs.mkdirSync(".test-build/convex", { recursive: true });
        fs.writeFileSync(path.join(".test-build", "convex", path.basename(file, ".ts") + ".js"), result.outputText);
      }
    }
  }
}
check(root);
console.log(`Strict domain/UI typecheck passed. Syntax checked ${checked} TypeScript/TSX modules.\nProvider tests use mocked HTTP; they do not contact an AI service.`);
const tests = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "tests/core.test.cjs", "tests/provider.test.cjs"], { stdio: "inherit" });
process.exit(tests.status ?? 1);
