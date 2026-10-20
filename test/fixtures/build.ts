let hasBuilt = false;

export function assertBuildSuccess(result: { exitCode: number }): void {
  if (result.exitCode !== 0) {
    throw new Error(`Build failed with exit code ${result.exitCode}`);
  }
}

export function ensureBuild(force = false): void {
  if (hasBuilt && !force) {
    return;
  }
  const build = Bun.spawnSync(["bun", "run", "build"], {
    stdout: "inherit",
    stderr: "inherit",
  });
  assertBuildSuccess(build);
  hasBuilt = true;
}
