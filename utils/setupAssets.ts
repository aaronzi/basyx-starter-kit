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
import { createLocalRealm } from '@/utils/securitySetup';

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
  zip.file(
    'keycloak/realm/basyx-realm.json',
    createLocalRealm(setup.adminPassword, setup.uiUrl, setup.uiClientId)
  );
  return `\n## Local Keycloak\n\nOpen http://keycloak.localhost:8080 and sign in as \`basyx-admin\` with the temporary password \`${setup.adminPassword}\`. Change it immediately. This local identity provider is for development only.\n`;
}
