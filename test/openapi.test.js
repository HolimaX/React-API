const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const YAML = require("yaml");
const { createApiClient, loadOpenApiDocument } = require("../src");
const packagedOpenApi = require("../src/openapi");

const root = path.resolve(__dirname, "..");
const schemaPath = path.join(root, "postman", "schemas", "swagger.yaml");

test("OpenAPI document parses and declares the expected version", () => {
  const document = loadOpenApiDocument();

  assert.equal(document.openapi, "3.1.0");
  assert.ok(document.paths && Object.keys(document.paths).length > 0);
  assert.ok(document.components?.securitySchemes?.bearerAuth);
  assert.ok(document.components?.securitySchemes?.oktaOidc);
  assert.equal(packagedOpenApi.info.title, document.info.title);
  assert.match(document.info.description, /Demo: a public reference deployment/);
  assert.match(document.info.description, /Mock: a simulated or local-compatible implementation/);
  assert.equal(document["x-integrator-environments"].demo.kind, "reference-deployment");
  assert.equal(document["x-integrator-environments"].mock.kind, "simulated-implementation");
  assert.equal(document["x-integrator-environments"].production.kind, "integrator-hosted-implementation");
});

test("API client sends bearer tokens and JSON requests", async () => {
  const calls = [];
  const fetchMock = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true })
    };
  };
  const client = createApiClient({
    baseUrl: "https://api.example.test/",
    accessToken: "test-token",
    fetch: fetchMock
  });

  await client.createUser({ email: "person@example.test" });

  assert.equal(calls[0].url, "https://api.example.test/api/users");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.get("Authorization"), "Bearer test-token");
  assert.equal(calls[0].init.headers.get("Content-Type"), "application/json");
});

test("protected API operations use bearer access-token authentication", () => {
  const document = YAML.parse(fs.readFileSync(schemaPath, "utf8"));
  const protectedOperations = Object.values(document.paths)
    .flatMap((pathItem) => Object.values(pathItem))
    .filter((operation) => operation && typeof operation === "object" && operation.operationId);

  assert.ok(protectedOperations.length > 0);
  for (const operation of protectedOperations) {
    assert.deepEqual(operation.security ?? document.security, [{ bearerAuth: [] }]);
  }
});

test("tracked project files do not contain common credential assignments", () => {
  const ignored = new Set([".git", "node_modules", "coverage"]);
  const credentialPattern = /(?:client[_-]?secret|clientSecret|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["'][^"']+["']|BEGIN (?:RSA|EC|OPENSSH) PRIVATE KEY/i;
  const files = [];

  function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(entryPath);
      else files.push(entryPath);
    }
  }

  collect(root);
  for (const file of files) {
    if (path.relative(root, file).startsWith("test/")) continue;
    const content = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(content, credentialPattern, path.relative(root, file));
  }
});