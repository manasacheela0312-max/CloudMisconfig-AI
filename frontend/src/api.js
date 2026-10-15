const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: body
      ? { "Content-Type": "application/json" }
      : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  health: () => request("/api/health"),
  sample: () => request("/api/sample"),
  scan: (config) => request("/api/scan", { config }),
  analyze: (findings) => request("/api/analyze", { findings }),
  remediate: (config, finding_ids) =>
    request("/api/remediate", { config, finding_ids }),
  verify: (original, proposed) =>
    request("/api/verify", { original, proposed })
};