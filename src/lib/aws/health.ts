import { getConfig } from "@/store/config";

export type HealthStatus = {
  ok: boolean;
  latencyMs: number;
  services: Record<string, string>;
  edition?: string;
  version?: string;
  error?: string;
};

export async function fetchHealth(): Promise<HealthStatus> {
  const { endpoint } = getConfig();
  const url = `${endpoint.replace(/\/$/, "")}/_localstack/health`;
  const t0 = performance.now();
  try {
    const res = await fetch(url, { cache: "no-store" });
    const latencyMs = Math.round(performance.now() - t0);
    if (!res.ok) {
      return { ok: false, latencyMs, services: {}, error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    return {
      ok: true,
      latencyMs,
      services: json.services ?? {},
      edition: json.edition,
      version: json.version,
    };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - t0),
      services: {},
      error: e instanceof Error ? e.message : "Failed to fetch",
    };
  }
}
