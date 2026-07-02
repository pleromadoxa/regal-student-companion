import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Read a secret from process.env or Cloudflare Worker bindings. */
export async function getRuntimeEnv(name: string): Promise<string | undefined> {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;

  try {
    const { env } = await getCloudflareContext({ async: true });
    const value = (env as Record<string, unknown>)[name];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

export async function hasRuntimeEnv(name: string): Promise<boolean> {
  return Boolean(await getRuntimeEnv(name));
}
