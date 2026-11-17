// Checks every *.user.js in the repository root:
// - the file parses as JavaScript (node --check)
// - the ==UserScript== header exists and has @name, @version and @match
import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const files = readdirSync(".").filter((f) => f.endsWith(".user.js")).sort();
let failed = 0;

for (const file of files) {
  const problems = [];

  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (e) {
    problems.push(`syntax error:\n${e.stderr.toString().trim()}`);
  }

  const text = readFileSync(file, "utf8");
  const header = text.match(/\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/);
  if (!header) {
    problems.push("missing ==UserScript== header");
  } else {
    for (const key of ["@name", "@version", "@match"]) {
      if (!new RegExp(`^//\\s*${key}\\s+\\S`, "m").test(header[1])) {
        problems.push(`missing ${key} in header`);
      }
    }
  }

  if (problems.length) {
    failed++;
    for (const p of problems) console.log(`::error file=${file}::${p.split("\n")[0]}`);
    console.log(`NG  ${file}\n    ${problems.join("\n    ")}`);
  } else {
    console.log(`OK  ${file}`);
  }
}

if (files.length === 0) {
  console.log("::error::no *.user.js files found");
  process.exit(1);
}
process.exit(failed ? 1 : 0);
