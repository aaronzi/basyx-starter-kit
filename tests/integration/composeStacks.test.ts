import * as yaml from 'js-yaml';
import { spawnSync } from 'node:child_process';
import { createPinia, setActivePinia } from 'pinia';
import { useAppStore } from '@/stores/app';
import { localBrokerServices, localObservabilityServices } from '@/utils/localStacks';
import { updateOptionalServices } from '@/utils/optionalServices';
import { localKeycloakService } from '@/utils/securitySetup';

const dockerAvailable =
  spawnSync('docker', ['compose', 'version'], { encoding: 'utf8' }).status === 0;

describe.skipIf(!dockerAvailable)('Docker Compose output', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAppStore().initializeStarterDefaults();
  });

  for (const broker of ['mqtt', 'kafka', 'amqp'] as const) {
    it(`accepts a generated local ${broker} and observability stack`, () => {
      updateOptionalServices(localBrokerServices(broker), [
        'mqtt',
        'kafka',
        'kafka-init',
        'rabbitmq',
      ]);
      updateOptionalServices(localObservabilityServices(true, true), [
        'otel-collector',
        'prometheus',
        'tempo',
        'loki',
        'alloy',
        'grafana',
      ]);
      updateOptionalServices(
        localKeycloakService({
          host: 'db',
          port: '5432',
          name: 'basyxTestDB',
          user: 'admin',
          password: 'admin123',
          local: true,
        }),
        ['keycloak']
      );
      const compose = yaml.dump(useAppStore().getDockerComposeConfig?.value);
      const result = spawnSync('docker', ['compose', '-f', '-', 'config', '--quiet'], {
        input: compose,
        encoding: 'utf8',
      });
      expect(result.status, result.stderr).toBe(0);
    });
  }

  it('accepts the HTTPS Keycloak used for MCP sign-in', () => {
    useAppStore().updateServiceEnvironment('aas-environment', {
      ABAC_ENABLED: 'true',
      MCP_ENABLED: 'true',
    });
    updateOptionalServices(
      localKeycloakService(
        {
          host: 'db',
          port: '5432',
          name: 'basyxTestDB',
          user: 'admin',
          password: 'admin123',
          local: true,
        },
        true
      ),
      ['keycloak', 'keycloak-certificate']
    );
    const compose = yaml.dump(useAppStore().getDockerComposeConfig?.value);
    const result = spawnSync('docker', ['compose', '-f', '-', 'config', '--format', 'json'], {
      input: compose,
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).toBe(0);
    const services = JSON.parse(result.stdout).services;
    expect(services.keycloak.depends_on['keycloak-certificate'].condition).toBe(
      'service_completed_successfully'
    );
    expect(services['keycloak-certificate'].command[0]).toContain('keytool -genkeypair');
  });
});
