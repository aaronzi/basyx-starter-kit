import {
  buildAasEnvironmentExternalUrl,
  buildExternalServiceUrl,
  DEFAULT_AAS_ENVIRONMENT_EXTERNAL_PORT,
  DEFAULT_AAS_UI_EXTERNAL_PORT,
} from './externalUrls';

interface SetupReadmeOptions {
  externalBaseUrl: string;
  aasEnvironmentExternalPort?: number;
  aasEnvironmentContextPath?: string;
  aasUiExternalPort?: number;
  aasUiBasePath?: string;
}

export function createSetupReadme({
  externalBaseUrl,
  aasEnvironmentExternalPort,
  aasEnvironmentContextPath,
  aasUiExternalPort,
  aasUiBasePath,
}: SetupReadmeOptions): string {
  const aasEnvironmentUrl = buildAasEnvironmentExternalUrl(
    externalBaseUrl,
    aasEnvironmentExternalPort ?? DEFAULT_AAS_ENVIRONMENT_EXTERNAL_PORT,
    aasEnvironmentContextPath
  );
  const aasWebUiUrl = buildExternalServiceUrl(
    externalBaseUrl,
    aasUiExternalPort ?? DEFAULT_AAS_UI_EXTERNAL_PORT,
    aasUiBasePath
  );

  return `# BaSyx Setup
This setup uses BaSyx Go components and PostgreSQL.

## Start
1. Extract this archive.
2. Open a terminal in the extracted folder.
3. Start the stack:
\`\`\`
docker compose up -d
\`\`\`

## Endpoints
- AAS Environment: ${aasEnvironmentUrl}
- AAS Web UI: ${aasWebUiUrl}

## Notes
- A unique RSA private key is generated in your browser for this setup at \`basyx/rsa-key.pem\`.
- Keep this private key confidential and replace it if you suspect it has been exposed.
- Infrastructure connections for the UI are defined in \`basyx-infra.yml\`.
- Add extra browser destinations to the selected infrastructure's \`trustedOrigins\` list as exact
  HTTP(S) origins (scheme, host, and optional port only). Configured component origins, relative
  URLs, and the deployed BaSyx Web UI's origin are trusted automatically.
- Telegraf is optional and off by default. If it is omitted, supply time-series data through your
  existing collector or another ingestion process.
- The Starter Kit prefills the local InfluxDB container's HTTP origin. For external InfluxDB or
  an HTTPS reverse proxy, configure the browser-accessible origin explicitly.
- Additional trusted origins may receive infrastructure credentials. List only destinations you
  trust with these credentials. The InfluxDB LinkedSegment token does not make its destination
  trusted.
- Web UI backend requests do not follow redirects. Configure the final endpoint URL directly and
  trust its origin when it is not already a configured component origin.
- Place your own AAS files into the \`aas/\` folder or upload through the UI.

## BaSyx Go configuration
The AAS Environment is configured through environment variables in \`docker-compose.yml\`.
The generated file includes the settings selected in the Starter Kit for:

- HTTP timeouts, model verification, CORS, and upload limits
- PostgreSQL connectivity and connection pooling
- AAS and Submodel history, audit mode, and optional S3-compatible evidence
- REST event feed and optional MQTT, Kafka, or AMQP event publication
- Logging and optional OpenTelemetry trace and metric export

OpenTelemetry OTLP export requires a separately operated Collector. History evidence requires an
existing S3-compatible bucket with object lock configured. Message broker destinations are not
created by this setup.`;
}
