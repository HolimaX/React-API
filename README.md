# @HolimaX/beerbank-api

Publishable Node package containing the public OpenAPI contract and a small fetch-based client for the React API. It does not contain an API server or Okta credentials.

## Install

```sh
npm install @HolimaX/beerbank-api
```

The package is published to GitHub Packages. Configure the `@HolimaX` npm scope and authenticate with a GitHub token that has package-read access in the consuming project. Keep the token in the developer or CI environment, never in `package.json`, source code, or committed configuration.

## Use from React

```js
import { createApiClient } from "@HolimaX/beerbank-api";

const api = createApiClient({
	baseUrl: process.env.REACT_APP_PCD_PATH,
	getAccessToken: () => oktaAuth.getAccessToken()
});

const people = await api.listPeople();
```

`baseUrl` is the API host without the `/api` suffix. The client adds `/api` to its endpoint paths. `getAccessToken` should return an Okta access token; the client sends it as a bearer token and never stores it.

The client requires Node 18+ for server-side use. Browsers with `fetch` and `Headers` are supported.

## Okta integration status

The contract now describes an OIDC authorization-code flow for the React application and bearer access tokens for protected API calls. The React repository must still implement the Okta client using its own public configuration:

- Okta issuer: `https://<your-okta-domain>/oauth2/<your-authorization-server-id>`
- Client ID: a browser-safe Okta application client ID
- Redirect URI: an exact URI registered in Okta for each environment
- API audience and scopes: configured in the Okta authorization server and matched by the API implementation

Never commit client secrets, private keys, refresh tokens, access tokens, `.env` files, or production URLs containing credentials. A client ID and issuer are not secrets, but they should still be supplied through deployment configuration.

This repository does not deploy an API. Deployment is required only after a compatible API implementation exists. Updating this contract alone cannot make Okta login work; the React client and API token validation must use the same issuer, audience, and scopes.

## Publish to GitHub Packages

The package metadata already points to `https://npm.pkg.github.com/` and exposes both CommonJS and ESM entry points. From a clean checkout:

```sh
npm ci
npm test
npm pack --dry-run
npm publish
```

Publishing requires package-write permission in the configured GitHub npm authentication. Do not place the token in the repository or pass it through a committed `.npmrc`.

## Validation

```sh
npm install
npm test
```

The tests parse `postman/schemas/swagger.yaml`, verify the Okta/OIDC security definitions, and reject common secret-like values in tracked project files.

## API definition

The OpenAPI document is [postman/schemas/swagger.yaml](postman/schemas/swagger.yaml). It can be imported through the package's `@HolimaX/beerbank-api/openapi` export or used directly for generating clients, Postman collections, and server stubs.