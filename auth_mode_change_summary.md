# Auth Mode Change Summary

## Overview

This update introduces a **runtime-selectable authentication model** for the `fhirviewer` application. The code now supports **three auth modes**:

| Mode | Purpose | Expected runtime behavior |
| --- | --- | --- |
| `msal` | Preserve the existing Microsoft-based flow | The app initializes MSAL, acquires a bearer token, and sends it to the FHIR server |
| `none` | Support local or otherwise open FHIR servers | The app skips login entirely and omits the `Authorization` header |
| `gcp` | Support Google Cloud token-based access from the browser | The app initializes Google Identity Services, prompts the user to sign in, and sends the resulting bearer token |

The implementation also makes the FHIR endpoint layer more flexible so the viewer can run against a **non-partitioned local FHIR server** as well as the existing partition-aware deployment shape.

## Main Code Changes

| File | Change |
| --- | --- |
| `src/config/runtime.ts` | Added a shared runtime configuration module for auth mode, FHIR endpoint settings, partition behavior, MSAL settings, and Google Cloud settings |
| `src/auth/tokenStore.ts` | Added a shared token store so data access is no longer coupled directly to MSAL hooks |
| `src/auth/AuthProvider.tsx` | Added generic auth providers for `none`, `msal`, and `gcp` modes |
| `src/components/AuthenticatedApp/AuthenticatedApp.tsx` | Reworked the auth gate so local no-auth mode renders immediately and Google Cloud mode can show an explicit sign-in prompt |
| `src/main.tsx` | Changed bootstrapping so MSAL initializes only when `VITE_AUTH_MODE=msal` |
| `src/providers/FHIRClient.tsx` | Refactored request construction to support optional auth headers and unpartitioned FHIR URLs |
| `src/security/msalConfig.tsx` | Switched to the shared runtime configuration |
| `src/parameters.ts` | Updated legacy parameter exports to align with the new config model |
| `README.md` and `.env.example` | Added usage documentation and example configuration for all three modes |
| `package.json` | Added the existing Litehouse dependency so the manifest better matches the imported code |

## Runtime Examples

### Local no-auth testing

```bash
VITE_AUTH_MODE=none
VITE_FHIR_BASE_URL=http://localhost:8080/fhir
VITE_FHIR_USE_PARTITIONS=false
```

### Google Cloud auth mode

```bash
VITE_AUTH_MODE=gcp
VITE_FHIR_BASE_URL=https://healthcare.googleapis.com/v1/projects/PROJECT/locations/LOCATION/datasets/DATASET/fhirStores/STORE/fhir
VITE_FHIR_USE_PARTITIONS=false
VITE_GCP_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_GCP_SCOPES=https://www.googleapis.com/auth/cloud-platform
```

## Validation Status

Validation was performed at the repository level with a lightweight consistency check:

| Check | Result |
| --- | --- |
| Working branch | `feature/auth-mode-switch` |
| Git diff consistency (`git diff --check`) | Passed |
| Full dependency install and production build | Not completed in this pass |

The full build was not re-run here because the repository already had broader pre-existing stability issues and previous dependency installation attempts had been unreliable. As a result, the auth-mode work should be treated as an implementation pass that still needs a complete install-and-build verification cycle in the target environment.

## External Basis for the Google Cloud Path

The Google Cloud approach in this change is based on Google documentation indicating that Cloud Healthcare API calls can use bearer tokens and that browser applications can obtain Google API access tokens through Google Identity Services.[1] [2]

## References

[1]: https://docs.cloud.google.com/healthcare-api/docs/authentication "Authenticate to Cloud Healthcare API | Google Cloud"
[2]: https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow "OAuth 2.0 for Client-side Web Applications | Google for Developers"
