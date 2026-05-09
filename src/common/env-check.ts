export function assertEnv(vars: string[]) {
  const missing: string[] = [];
  for (const v of vars) {
    if (!process.env[v]) missing.push(v);
  }
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
