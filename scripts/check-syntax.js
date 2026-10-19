const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const IGNORED_DIRECTORIES = new Set([".git", "node_modules"]);
const files = [];

function collectJavaScript(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!IGNORED_DIRECTORIES.has(entry.name)) {
                collectJavaScript(path.join(directory, entry.name));
            }
            continue;
        }

        if (entry.isFile() && entry.name.endsWith(".js")) {
            files.push(path.join(directory, entry.name));
        }
    }
}

collectJavaScript(ROOT);

let failed = 0;
for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) {
        failed += 1;
        console.error(`\n[SYNTAX ERROR] ${path.relative(ROOT, file)}`);
        if (result.stdout) process.stderr.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);
    }
}

if (failed > 0) {
    console.error(`\nSyntax validation failed: ${failed} of ${files.length} JavaScript files.`);
    process.exitCode = 1;
} else {
    console.log(`Syntax validation passed: ${files.length} JavaScript files checked.`);
}
