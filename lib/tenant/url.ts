/** Derive a full base URL from a request host (e.g. "figata.com" → "https://figata.com") */
export function getBaseUrl(host: string): string {
  const domain = host.split(":")[0];
  const isLocal = domain === "localhost" || domain.endsWith(".lvh.me");
  const protocol = isLocal ? "http" : "https";
  const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
  return `${protocol}://${domain}${port}`;
}
