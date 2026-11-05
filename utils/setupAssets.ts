import type { ComposeService } from '@/utils/optionalServices';
import type JSZip from 'jszip';
import {
  ALLOY_CONFIG,
  grafanaDatasources,
  LOKI_CONFIG,
  MOSQUITTO_CONFIG,
  OTEL_COLLECTOR_CONFIG,
  PROMETHEUS_CONFIG,
  RABBITMQ_CONFIG,
  rabbitmqDefinitions,
  TEMPO_CONFIG,
} from '@/utils/localStacks';
import {
  createLocalRealm,
  defaultLocalKeycloakEndpoint,
  LEGACY_LOCAL_KEYCLOAK_AUDIENCE,
  LOCAL_KEYCLOAK_AUDIENCE,
  LOCAL_KEYCLOAK_CERTIFICATE,
  LOCAL_REBAC_ADMIN_GROUP,
  localKeycloakEndpoint,
  localKeycloakOrigin,
} from '@/utils/securitySetup';

export interface SetupAssets {
  services: Record<string, ComposeService>;
  environment: Record<string, string>;
  policyJson: string;
  trustListJson: string;
  uiUrl: string;
  uiClientId: string;
  adminPassword?: string;
}

export function addOptionalSetupAssets(zip: JSZip, setup: SetupAssets): string {
  const { services, environment } = setup;
  if (services.mqtt) zip.file('mosquitto.conf', MOSQUITTO_CONFIG);
  if (services.rabbitmq) {
    zip.file('rabbitmq.conf', RABBITMQ_CONFIG);
    zip.file(
      'rabbitmq-definitions.json',
      rabbitmqDefinitions(environment.BASYX_EVENTING_AMQP_ADDRESS)
    );
  }
  if (services['otel-collector']) {
    zip.file('otel-collector.yaml', OTEL_COLLECTOR_CONFIG);
    zip.file('prometheus.yml', PROMETHEUS_CONFIG);
    zip.file('tempo.yaml', TEMPO_CONFIG);
  }
  if (services.loki) {
    zip.file('loki.yaml', LOKI_CONFIG);
    zip.file('alloy/config.alloy', ALLOY_CONFIG);
  }
  if (services.grafana) {
    zip.file(
      'grafana/provisioning/datasources/datasources.yaml',
      grafanaDatasources(Boolean(services['otel-collector']), Boolean(services.loki))
    );
  }
  if (environment.ABAC_ENABLED !== 'true') return '';
  zip.file('security_env/access-rules.json', setup.policyJson);
  zip.file('security_env/trustlist.json', setup.trustListJson);
  if (!services.keycloak) return '';
  if (!setup.adminPassword)
    throw new Error('A unique Keycloak administrator password is required.');
  const tls = environment.MCP_ENABLED === 'true';
  zip.file(
    'keycloak/realm/basyx-realm.json',
    createLocalRealm(setup.adminPassword, setup.uiUrl, setup.uiClientId, tls)
  );
  const rebacNote =
    environment.REBAC_ENABLED === 'true'
      ? ` \`basyx-admin\` is a member of the \`${LOCAL_REBAC_ADMIN_GROUP}\` group. Add users to this group to make them ReBAC administrators, or to other groups to share resources with them.`
      : '';
  const endpoint = localKeycloakEndpoint(services.keycloak) ?? defaultLocalKeycloakEndpoint(tls);
  return `\n## Local Keycloak\n\nOpen ${localKeycloakOrigin(endpoint)} and sign in as \`basyx-admin\` with the temporary password \`${setup.adminPassword}\`. Change it immediately.${rebacNote} This local identity provider is for development only.\n${keycloakRealmUpgradeReadme()}${endpoint.tls ? keycloakCertificateReadme(endpoint.port) : ''}`;
}

function keycloakRealmUpgradeReadme(): string {
  return `
Keycloak imports \`keycloak/realm/basyx-realm.json\` only while the \`basyx\` realm does not exist. If
you start this setup with the Keycloak database of an earlier setup, Keycloak keeps the old realm.
Its tokens may then carry the old audience \`${LEGACY_LOCAL_KEYCLOAK_AUDIENCE}\` instead of
\`${LOCAL_KEYCLOAK_AUDIENCE}\`, which \`security_env/trustlist.json\` requires, and lack the MCP
sign-in settings. Either recreate the Keycloak database, for the local PostgreSQL with
\`docker compose down -v\` (this deletes all BaSyx data as well), or add an audience mapper for
\`${LOCAL_KEYCLOAK_AUDIENCE}\` to the realm's clients.
`;
}

function keycloakCertificateReadme(port: number): string {
  return `
### Trust the Keycloak Certificate

MCP clients only open sign-in pages served over HTTPS, so Keycloak serves HTTPS on port ${port} and
the Web UI signs in there as well. On the first start, the \`keycloak-certificate\` service creates a
self-signed certificate for \`keycloak.localhost\` in \`keycloak/tls/\`. Trust it once so that browsers
and MCP clients accept it. On macOS, trust it for TLS only:

\`\`\`
security add-trusted-cert -r trustRoot -p ssl -k ~/Library/Keychains/login.keychain-db ${LOCAL_KEYCLOAK_CERTIFICATE}
\`\`\`

Remove the trust again when you no longer need this setup:

\`\`\`
security remove-trusted-cert ${LOCAL_KEYCLOAK_CERTIFICATE}
\`\`\`

On other systems, add \`${LOCAL_KEYCLOAK_CERTIFICATE}\` to the system or browser trust store. To create a
new certificate, delete \`keycloak/tls/\` and start the stack again. The AAS Environment reads Keycloak's
keys over the Docker network and does not need the certificate.
`;
}
