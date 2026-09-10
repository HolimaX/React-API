const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");

const openApiPath = path.join(__dirname, "..", "postman", "schemas", "swagger.yaml");

class ApiError extends Error {
  constructor(message, status, responseBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

function loadOpenApiDocument() {
  return YAML.parse(fs.readFileSync(openApiPath, "utf8"));
}

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl || typeof baseUrl !== "string") {
    throw new TypeError("createApiClient requires a non-empty baseUrl");
  }
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function createApiClient(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl = options.fetch || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new TypeError("createApiClient requires fetch or a runtime with global fetch");
  }

  const getAccessToken = typeof options.getAccessToken === "function"
    ? options.getAccessToken
    : () => options.accessToken;

  async function request(route, init = {}) {
    const headers = new Headers(init.headers || {});
    headers.set("Accept", "application/json");
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    const accessToken = await getAccessToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetchImpl(`${baseUrl}${route}`, { ...init, headers });
    const contentType = response.headers?.get?.("content-type") || "";
    const responseBody = contentType.includes("json") ? await response.json() : await response.text();
    if (!response.ok) {
      throw new ApiError(`API request failed with HTTP ${response.status}`, response.status, responseBody);
    }
    return responseBody;
  }

  return {
    request,
    listPeople: () => request("/api/people"),
    getPeople: (id) => request(`/api/people/${encodeURIComponent(id)}`),
    searchPeople: (keyword) => request(`/api/people/${encodeURIComponent(keyword)}`),
    createUser: (user) => request("/api/users", { method: "POST", body: JSON.stringify(user) }),
    getHealthCards: () => request("/api/health-cards")
  };
}

module.exports = {
  ApiError,
  createApiClient,
  loadOpenApiDocument,
  openApiPath
};