# BaSyx AAS Starter Kit

This repository contains the source code for the BaSyx Starter Kit (Website). The site can be found at [https://basyx.org](https://basyx.org).

## Use Case

The AAS Starter Kit is a frontend only web application used to create a BaSyx setup.
This setup can be downloaded as a zip file and contains all necessary files to start the BaSyx infrastructure.
This includes a Docker Compose file, UI infrastructure configuration and optional Asset
Administration Shell (AAS) files. The generated runtime uses the combined BaSyx Go AAS Environment,
the BaSyx Go Configuration Service and PostgreSQL.

## How to use

Just follow the instructions on the website. It asks relevant questions to determine what services are needed and how to tailor them to your need. After the configuration is done, you can download the setup folder as a zip file.
Make sure that you have Docker installed on your machine. If not, you can download it from [the Docker Website](https://www.docker.com/products/docker-desktop).

The guided process covers BaSyx Go runtime and API limits, PostgreSQL, history and audit settings,
eventing, logging, OpenTelemetry, UI integration and container settings. External dependencies such
as an OpenTelemetry Collector, an event broker or an S3-compatible evidence store are referenced by
the generated configuration but are not deployed by the Starter Kit.

## Local Development

Prerequisites:

- node/npm
- pnpm

Run the following command in the root of the repo to start a dev server:

```bash
pnpm run dev
```

## Testing

The project uses Vitest for unit, component and integration tests.

Run test suites:

```bash
pnpm test
pnpm test:unit
pnpm test:component
pnpm test:integration
pnpm test:coverage
pnpm typecheck
```

## Shareable Configuration Links

The starter kit persists configuration in the URL query so setups are reload-safe, shareable, and
SSR can render the restored state directly.

- Query key: `cfg`
- Format: `?cfg=v1.<compressed-payload>`
- Payload includes:
  - current `/get-started/...` route
  - serializable setup state

Behavior:

- Reload restores current wizard progress.
- Opening a shared link restores the exact wizard page and configuration.
- Legacy `#cfg=v1...` links are migrated to `?cfg=v1...` on first client load.
- Unknown keys are ignored and missing values fall back to defaults.
- Unsupported payload versions soft-fail without breaking the app.

Security/data handling:

- Sensitive keys (for example passwords/tokens/secrets/private-key-like fields) are stripped before URL encoding.
- File uploads/binary objects are never put into the URL payload.
