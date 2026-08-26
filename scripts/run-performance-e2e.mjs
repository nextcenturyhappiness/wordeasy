import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runScript(name) {
  const result = spawnSync(npmCommand, ["run", name], {
    env: process.env,
    stdio: "inherit"
  });
  return result.status ?? 1;
}

let testStatus = runScript("build:cloud-performance-fixture");
if (testStatus === 0) {
  testStatus = runScript("test:perf:cloud-run");
}
if (testStatus === 0) {
  testStatus = runScript("build:performance-fixture");
}
if (testStatus === 0) {
  testStatus = runScript("test:perf:e2e:run");
}

const restoreStatus = runScript("build");
process.exitCode = testStatus === 0 ? restoreStatus : testStatus;
