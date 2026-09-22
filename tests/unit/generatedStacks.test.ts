import * as yaml from 'js-yaml';
import JSZip from 'jszip';
import { createPinia, setActivePinia } from 'pinia';
import { useAppStore } from '@/stores/app';
import {
  grafanaDatasources,
  localBrokerServices,
  localObservabilityServices,
  rabbitmqDefinitions,
} from '@/utils/localStacks';
import { updateOptionalServices } from '@/utils/optionalServices';
import {
  createLocalRealm,
  DEFAULT_POLICY,
  defaultTrustList,
  localKeycloakService,
  validatePolicy,
  validateTrustList,
} from '@/utils/securitySetup';
import { addOptionalSetupAssets } from '@/utils/setupAssets';

describe('generated local stacks', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAppStore().initializeStarterDefaults();
  });

  it('uses matching broker endpoints and provisions the selected Kafka topic and AMQP queue', () => {
    const mqtt = localBrokerServices('mqtt');
    const kafka = localBrokerServices('kafka', 'custom.events');
    const amqp = localBrokerServices('amqp');
    expect(mqtt.mqtt?.image).toBe('eclipse-mosquitto:2.0.22');
    expect(kafka['kafka-init']?.command).toContain('custom.events');
    expect(amqp.rabbitmq?.volumes).toContain(
      './rabbitmq-definitions.json:/etc/rabbitmq/definitions.json:ro'
    );
    expect(JSON.parse(rabbitmqDefinitions('/queues/custom.events')).queues[0].name).toBe(
      'custom.events'
    );
  });

  it('adds and removes optional services without disturbing core services or named volumes', () => {
    const store = useAppStore();
    const managed = ['otel-collector', 'prometheus', 'tempo', 'loki', 'alloy', 'grafana'];
    updateOptionalServices(localObservabilityServices(true, true), managed);
    let compose = store.getDockerComposeConfig?.value as {
      services: Record<string, unknown>;
      volumes: Record<string, unknown>;
    };
    expect(compose.services['aas-environment']).toBeDefined();
    expect(compose.services.grafana).toBeDefined();
    expect(Object.keys(compose.volumes)).toEqual(
      expect.arrayContaining(['prometheus-data', 'tempo-data', 'alloy-data'])
    );
    expect(yaml.load(yaml.dump(compose))).toEqual(compose);
    updateOptionalServices({}, managed);
    compose = store.getDockerComposeConfig?.value as typeof compose;
    expect(compose.services.grafana).toBeUndefined();
    expect(compose.services['aas-environment']).toBeDefined();
    expect(compose.volumes).toBeUndefined();
    expect(grafanaDatasources(true, true)).toContain('http://loki:3100');
  });

  it('validates policy and trust-list structure and generates a local realm', () => {
    expect(validatePolicy(DEFAULT_POLICY)).toBeUndefined();
    expect(validatePolicy('{')).toMatch(/Invalid JSON/);
    expect(validatePolicy('{}')).toMatch(/AllAccessPermissionRules/);
    const policy = JSON.parse(DEFAULT_POLICY);
    policy.AllAccessPermissionRules.rules[0].FORMULA = { $boolean: true };
    delete policy.AllAccessPermissionRules.rules[0].USEFORMULA;
    expect(validatePolicy(JSON.stringify(policy))).toBeUndefined();
    policy.AllAccessPermissionRules.DEFACLS[0].acl.USEATTRIBUTES = ['role_attr'];
    expect(validatePolicy(JSON.stringify(policy))).toMatch(/USEATTRIBUTES/);
    expect(validateTrustList(defaultTrustList())).toBeUndefined();
    expect(validateTrustList('[{}]')).toMatch(/issuer/);
    const realm = JSON.parse(
      createLocalRealm('temporary-test-password', 'http://localhost:3000', 'custom-ui')
    );
    expect(realm.clients[0].clientId).toBe('custom-ui');
    expect(realm.users[0].credentials[0].temporary).toBe(true);
    const service = localKeycloakService({
      host: 'external-db',
      port: '5544',
      name: 'basyx',
      user: 'user',
      password: 'password',
      local: false,
    }).keycloak;
    expect(service?.depends_on).toBeUndefined();
    expect(service?.environment).toMatchObject({
      KC_DB_URL: 'jdbc:postgresql://external-db:5544/basyx',
    });
    expect(service?.networks).toEqual({ default: { aliases: ['keycloak.localhost'] } });
  });

  it('packages optional files and omits policy content from share snapshots', async () => {
    const store = useAppStore();
    store.accessPolicyJson = DEFAULT_POLICY;
    expect(JSON.stringify(store.createSerializableSnapshot())).not.toContain(
      'AllAccessPermissionRules'
    );
    const zip = new JSZip();
    const readme = addOptionalSetupAssets(zip, {
      services: {
        ...localBrokerServices('mqtt'),
        ...localObservabilityServices(true, true),
        ...localKeycloakService({
          host: 'db',
          port: '5432',
          name: 'basyxTestDB',
          user: 'admin',
          password: 'admin123',
          local: true,
        }),
      },
      environment: { ABAC_ENABLED: 'true' },
      policyJson: DEFAULT_POLICY,
      trustListJson: defaultTrustList(),
      uiUrl: 'http://localhost:3000',
      uiClientId: 'basyx-ui',
      adminPassword: 'generated-test-password',
    });
    for (const path of [
      'mosquitto.conf',
      'otel-collector.yaml',
      'prometheus.yml',
      'tempo.yaml',
      'loki.yaml',
      'alloy/config.alloy',
      'grafana/provisioning/datasources/datasources.yaml',
      'security_env/access-rules.json',
      'security_env/trustlist.json',
      'keycloak/realm/basyx-realm.json',
    ]) {
      expect(zip.file(path), path).not.toBeNull();
    }
    expect(readme).toContain('generated-test-password');
    expect(await zip.file('security_env/access-rules.json')?.async('string')).toBe(DEFAULT_POLICY);
  });
});
