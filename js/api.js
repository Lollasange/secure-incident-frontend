/* All endpoint paths come from the team's API reference (Nov 19, 2026).
 * TODO (integration): test on the canonical HTTPS domain, where the __Host-session
 * cookie is set. No API credentials or tokens are stored in browser storage.
 */
export async function api(path, { method = "GET", body } = {}) {
  const options = { method, credentials: "same-origin", headers: {} };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const response = await fetch("/api" + path, options);
  const isJson = (response.headers.get("Content-Type") || "").includes("application/json");
  const data = isJson ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(data && typeof data.error === "string" ? data.error : "Request failed. Please try again.");
    error.status = response.status;
    throw error;
  }
  return data;
}
