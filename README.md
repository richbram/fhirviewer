# FHIR Viewer App

This is a Vite-powered React application designed to search and render **FHIR resources** from configurable FHIR servers. The application now supports **three runtime authentication modes** so it can be used against enterprise environments, local development servers, and Google Cloud-hosted FHIR APIs.

---

## Key Features

- **Configurable Authentication Modes**
  Switch between **MSAL**, **no authentication**, and **Google Cloud auth** by setting environment variables.

- **Local FHIR Testing**
  Run the viewer against a plain local FHIR server without sending an `Authorization` header and without requiring partitioned URLs.

- **Universal FHIR Support**
  Search and render FHIR resources using `StructureDefinition.snapshot` metadata from supported servers or implementation guides.

- **Dynamic Search UI**
  Builds adaptive search forms from `SearchParameter` definitions.

- **Reusable Architecture**
  Modular React components are organized around a generic viewer, dynamic search builder, dynamic result table, and shared FHIR client.

---

## Authentication Modes

| Mode | Environment value | Behavior |
| --- | --- | --- |
| Microsoft Entra / MSAL | `VITE_AUTH_MODE=msal` | Uses the existing Microsoft authentication flow and sends a bearer token acquired through MSAL |
| Local no-auth | `VITE_AUTH_MODE=none` | Skips login entirely and omits the `Authorization` header |
| Google Cloud | `VITE_AUTH_MODE=gcp` | Uses a browser-based Google token flow and sends the resulting bearer token |

The Google Cloud mode is intended for Google APIs and Google Cloud-protected FHIR endpoints that accept OAuth bearer tokens. For Cloud Healthcare API specifically, Google documents that authorized REST calls can use OAuth 2.0 access tokens, and browser applications can use Google Identity Services to obtain them.[1] [2]

> "The Cloud Healthcare API doesn't require a specific token generation method. You can make authorized calls using a signed JSON Web Token (JWT) directly as a bearer token, instead of an OAuth 2.0 access token." [1]

> "Google Identity Services' token model is based upon the OAuth 2.0 implicit grant flow." [2]

---

## Runtime Configuration

### Generic FHIR settings

| Variable | Purpose |
| --- | --- |
| `VITE_FHIR_BASE_URL` | Base URL for the target FHIR server |
| `VITE_FHIR_USE_PARTITIONS` | Set to `true` for partitioned URLs or `false` for plain server URLs |
| `VITE_FHIR_PARTITION_ID` | Default partition ID when partitioning is enabled |
| `VITE_FHIR_PARTITIONS_LIST` | Optional list of partitions, using dot, comma, or space separators |
| `VITE_FHIR_PARTITION_MAP_URL` | Optional override for the partition resource map JSON |
| `VITE_FHIR_SEARCH_COUNT` | Default `_count` value appended to searches |

### MSAL settings

The existing Microsoft environment variables are still supported:

| Variable |
| --- |
| `VITE_APP_BCNC_CLIENT_ID` |
| `VITE_APP_BCNC_AUTHORITY` |
| `VITE_APP_BCNC_TENANT_ID` |
| `VITE_APP_BCNC_SCOPE` |

### Google Cloud settings

| Variable | Purpose |
| --- | --- |
| `VITE_GCP_CLIENT_ID` | OAuth client ID for the browser app |
| `VITE_GCP_SCOPES` | Space- or comma-separated OAuth scopes. A common default is `https://www.googleapis.com/auth/cloud-platform` |

---

## Example Configurations

### Local unauthenticated server

```bash
VITE_AUTH_MODE=none
VITE_FHIR_BASE_URL=http://localhost:8080/fhir
VITE_FHIR_USE_PARTITIONS=false
```

### Existing MSAL-backed environment

```bash
VITE_AUTH_MODE=msal
VITE_FHIR_BASE_URL=https://example.com/fhir
VITE_FHIR_USE_PARTITIONS=true
VITE_FHIR_PARTITION_ID=nchie
VITE_FHIR_PARTITIONS_LIST=nchie.payer.clinical
VITE_APP_BCNC_CLIENT_ID=your-client-id
VITE_APP_BCNC_AUTHORITY=https://login.microsoftonline.com/
VITE_APP_BCNC_TENANT_ID=your-tenant-id
VITE_APP_BCNC_SCOPE=api://your-app-id/.default
```

### Google Cloud auth mode

```bash
VITE_AUTH_MODE=gcp
VITE_FHIR_BASE_URL=https://healthcare.googleapis.com/v1/projects/PROJECT/locations/LOCATION/datasets/DATASET/fhirStores/STORE/fhir
VITE_FHIR_USE_PARTITIONS=false
VITE_GCP_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_GCP_SCOPES=https://www.googleapis.com/auth/cloud-platform
```

---

## Getting Started

```bash
yarn install
yarn dev
```

### Run Tests

```bash
yarn test
```

---

## Notes

The repository still contains broader implementation issues unrelated to the auth-mode switch, including pre-existing UI and metadata-loading inconsistencies. The new auth-mode work is focused on making the runtime configuration flexible enough for local no-auth testing and Google Cloud token-based access.

## References

[1]: https://docs.cloud.google.com/healthcare-api/docs/authentication "Authenticate to Cloud Healthcare API | Google Cloud"
[2]: https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow "OAuth 2.0 for Client-side Web Applications | Google for Developers"
