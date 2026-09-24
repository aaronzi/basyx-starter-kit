import { createPinia, setActivePinia } from 'pinia';
import { useAppStore } from '@/stores/app';
import { decodeConfigHash, encodeConfigHash } from '@/utils/configPersistence';
import { readServiceEnvironment } from '@/utils/dockerEnvironment';
import { localBrokerServices } from '@/utils/localStacks';
import { updateOptionalServices } from '@/utils/optionalServices';
import { localKeycloakService } from '@/utils/securitySetup';

describe('app store snapshot helpers', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('creates and reapplies a serializable snapshot', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateRegistryIntegration(false);
    store.setPrimaryDarkColor('#123456');

    const snapshot = store.createSerializableSnapshot();
    store.reset();
    store.initializeStarterDefaults();

    expect(store.getRegistryIntegration).toBe(true);
    store.applySerializableSnapshot(snapshot);
    expect(store.getRegistryIntegration).toBe(false);
    expect(store.getPrimaryDarkColor).toBe('#123456');
  });

  it('ignores unknown keys and keeps defaults for missing keys', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();

    store.applySerializableSnapshot({
      registryIntegration: false,
      unknownFeature: true,
    });

    expect(store.getRegistryIntegration).toBe(false);
    expect(store.getDiscoveryIntegration).toBe(true);
  });

  it('persists collector and Influx modes while stripping the external token from shares', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    expect(store.getIncludeTelegraf).toBe(false);
    store.updateTimeSeriesData(true);
    store.updateIncludeLocalInfluxDb(false);
    store.updateIncludeTelegraf(false);
    store.updateExternalInfluxSettings({
      url: 'https://influx.example.org',
      org: 'example-org',
      bucket: 'example-bucket',
      token: 'private-influx-token',
    });

    const encoded = encodeConfigHash({
      route: '/get-started/behaviour/time-series',
      state: store.createSerializableSnapshot(),
    });
    const decoded = decodeConfigHash(encoded);
    expect(JSON.stringify(decoded.payload)).not.toContain('private-influx-token');
    expect(decoded.payload?.state.externalInfluxSettings).toEqual({
      url: 'https://influx.example.org',
      org: 'example-org',
      bucket: 'example-bucket',
    });

    store.reset();
    store.initializeStarterDefaults();
    store.applySerializableSnapshot(decoded.payload?.state);
    expect(store.getIncludeLocalInfluxDb).toBe(false);
    expect(store.getIncludeTelegraf).toBe(false);
    expect(store.getExternalInfluxSettings).toEqual({
      url: 'https://influx.example.org',
      org: 'example-org',
      bucket: 'example-bucket',
      token: '',
    });
  });

  it('infers Telegraf and external Influx modes from legacy snapshots', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    const legacy = store.createSerializableSnapshot();
    legacy.timeSeriesData = true;
    delete legacy.includeTelegraf;
    delete legacy.includeLocalInfluxDb;
    delete legacy.externalInfluxSettings;
    const compose = legacy.dockerComposeConfig?.value as {
      services: Record<string, unknown>;
    };
    compose.services.telegraf = {
      environment: [
        'INFLUX_URL=https://legacy-influx.example.org',
        'INFLUX_ORG=legacy-org',
        'INFLUX_BUCKET=legacy-bucket',
        'INFLUX_TOKEN=legacy-token',
      ],
    };

    store.reset();
    store.initializeStarterDefaults();
    store.applySerializableSnapshot(legacy);

    expect(store.getIncludeTelegraf).toBe(true);
    expect(store.getIncludeLocalInfluxDb).toBe(false);
    expect(store.getExternalInfluxSettings).toEqual({
      url: 'https://legacy-influx.example.org',
      org: 'legacy-org',
      bucket: 'legacy-bucket',
      token: 'legacy-token',
    });
  });

  it('migrates legacy snapshots with current generated defaults', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    const snapshot = store.createSerializableSnapshot();
    const legacy = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;

    legacy.basyxConfig = legacy.basyxConfig.map(item => ({
      ...item,
      children: item.children.filter(
        child =>
          child.id !== 'ovw-aas-environment-history' &&
          child.id !== 'ovw-aas-environment-observability'
      ),
    }));
    const dockerComposeConfig = legacy.dockerComposeConfig;
    if (
      !dockerComposeConfig ||
      !dockerComposeConfig.value ||
      typeof dockerComposeConfig.value !== 'object'
    ) {
      throw new Error('Expected a generated Docker Compose configuration');
    }
    const services = (
      dockerComposeConfig.value as {
        services: Record<string, { environment?: string[] }>;
      }
    ).services;
    const aasEnvironment = services['aas-environment'];
    if (!aasEnvironment) {
      throw new Error('Expected the AAS Environment service');
    }
    aasEnvironment.environment = aasEnvironment.environment?.filter(
      entry =>
        !entry.startsWith('BASYX_HISTORY_') &&
        !entry.startsWith('BASYX_AUDIT_') &&
        !entry.startsWith('BASYX_EVENTING_') &&
        !entry.startsWith('OTEL_')
    );

    store.reset();
    store.initializeStarterDefaults();
    store.applySerializableSnapshot(legacy);

    const environment = readServiceEnvironment(store.getDockerComposeConfig?.value);
    expect(environment.BASYX_HISTORY_MODE).toBe('off');
    expect(environment.BASYX_EVENTING_ENABLED).toBe('false');
    expect(environment.OTEL_TRACES_EXPORTER).toBe('none');
    expect(store.getBasyxConfig[0]?.children.map(child => child.id)).toContain(
      'ovw-aas-environment-history'
    );
    expect(store.getBasyxConfig[0]?.children.map(child => child.id)).toContain(
      'ovw-aas-environment-observability'
    );
  });

  it('preserves mapping-style environments when updating a service', () => {
    const store = useAppStore();
    store.setDockerComposeConfig({
      value: {
        services: {
          'aas-environment': {
            environment: {
              KEEP: 'yes',
              REMOVE: 'old',
            },
          },
        },
      },
    });

    store.updateServiceEnvironment('aas-environment', { ADDED: 'new' }, ['REMOVE']);

    const environment = readServiceEnvironment(store.getDockerComposeConfig?.value);
    expect(environment).toEqual({ KEEP: 'yes', ADDED: 'new' });
  });

  it('keeps the BaSyx Go image tags paired when restoring a mismatched snapshot', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    const snapshot = store.createSerializableSnapshot();
    const compose = snapshot.dockerComposeConfig?.value as {
      services: Record<string, { image?: string }>;
    };
    compose.services['aas-environment']!.image = 'eclipsebasyx/aasenvironment-go:SNAPSHOT';
    compose.services.basyx_configuration!.image =
      'eclipsebasyx/basyxconfigurationservice-go:latest';

    store.applySerializableSnapshot(snapshot);
    const services = (store.getDockerComposeConfig?.value as typeof compose).services;
    expect(services['aas-environment']?.image).toBe('eclipsebasyx/aasenvironment-go:SNAPSHOT');
    expect(services.basyx_configuration?.image).toBe(
      'eclipsebasyx/basyxconfigurationservice-go:SNAPSHOT'
    );
  });

  it('keeps tags paired when the Configuration Service image changes directly', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    const compose = JSON.parse(JSON.stringify(store.getDockerComposeConfig)) as {
      value: { services: Record<string, { image?: string }> };
    };
    compose.value.services.basyx_configuration!.image =
      'eclipsebasyx/basyxconfigurationservice-go:SNAPSHOT';
    store.setDockerComposeConfig(compose);

    const services = (store.getDockerComposeConfig?.value as typeof compose.value).services;
    expect(services['aas-environment']?.image).toBe('eclipsebasyx/aasenvironment-go:SNAPSHOT');
    expect(services.basyx_configuration?.image).toBe(
      'eclipsebasyx/basyxconfigurationservice-go:SNAPSHOT'
    );
  });

  it('restores generated local service credentials after a secret-free shared link', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    updateOptionalServices(
      {
        ...localBrokerServices('amqp'),
        ...localKeycloakService({
          host: 'db',
          port: '5432',
          name: 'basyxTestDB',
          user: 'admin',
          password: 'admin123',
          local: true,
        }),
      },
      ['rabbitmq', 'keycloak']
    );
    store.updateServiceEnvironment('aas-environment', {
      BASYX_EVENTING_AMQP_PASSWORD: 'basyx-demo',
    });

    const encoded = encodeConfigHash({
      route: '/get-started/download',
      state: store.createSerializableSnapshot(),
    });
    const decoded = decodeConfigHash(encoded);
    expect(JSON.stringify(decoded.payload)).not.toContain('basyx-demo');
    store.reset();
    store.initializeStarterDefaults();
    store.applySerializableSnapshot(decoded.payload?.state);

    const services = (
      store.getDockerComposeConfig?.value as {
        services: Record<string, { environment?: Record<string, string> }>;
      }
    ).services;
    expect(services.keycloak?.environment?.KC_DB_PASSWORD).toBe('admin123');
    expect(services.rabbitmq?.environment?.RABBITMQ_DEFAULT_PASS).toBe('basyx-demo');
    expect(
      readServiceEnvironment(store.getDockerComposeConfig?.value).BASYX_EVENTING_AMQP_PASSWORD
    ).toBe('basyx-demo');
  });

  it('preserves external PostgreSQL mode and requires its password after sharing', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    const compose = JSON.parse(JSON.stringify(store.getDockerComposeConfig)) as {
      value: {
        services: Record<string, { environment?: string[]; depends_on?: Record<string, unknown> }>;
      };
    };
    delete compose.value.services.db;
    (compose.value.services as Record<string, unknown>).keycloak = localKeycloakService({
      host: 'external-postgres',
      port: '5432',
      name: 'basyxTestDB',
      user: 'admin',
      password: 'private-external-password',
      local: false,
    }).keycloak;
    (compose.value.services['aas-environment'] as { extra_hosts: string[] }).extra_hosts = [
      'keycloak.localhost:host-gateway',
    ];
    for (const name of ['aas-environment', 'basyx_configuration']) {
      const service = compose.value.services[name];
      if (!service?.environment) throw new Error(`Missing ${name} environment`);
      service.environment = service.environment.map(entry =>
        entry.startsWith('POSTGRES_HOST=')
          ? 'POSTGRES_HOST=external-postgres'
          : entry.startsWith('POSTGRES_PASSWORD=')
            ? 'POSTGRES_PASSWORD=private-external-password'
            : entry
      );
      delete service.depends_on?.db;
    }
    store.setDockerComposeConfig(compose);

    const encoded = encodeConfigHash({
      route: '/get-started/download',
      state: store.createSerializableSnapshot(),
    });
    expect(JSON.stringify(decodeConfigHash(encoded).payload)).not.toContain(
      'private-external-password'
    );
    store.reset();
    store.initializeStarterDefaults();
    store.applySerializableSnapshot(decodeConfigHash(encoded).payload?.state);

    const restored = store.getDockerComposeConfig?.value as typeof compose.value;
    expect(restored.services.db).toBeUndefined();
    for (const name of ['aas-environment', 'basyx_configuration']) {
      expect(restored.services[name]?.environment).toContain('POSTGRES_HOST=external-postgres');
      expect(
        restored.services[name]?.environment?.some(entry => entry.startsWith('POSTGRES_PASSWORD='))
      ).toBe(false);
      expect(restored.services[name]?.depends_on?.db).toBeUndefined();
    }
    const services = restored.services as Record<
      string,
      {
        extra_hosts?: string[];
        networks?: Record<string, unknown>;
        environment?: Record<string, string>;
      }
    >;
    expect(services['aas-environment']?.extra_hosts).toBeUndefined();
    expect(services.keycloak?.networks).toEqual({ default: { aliases: ['keycloak.localhost'] } });
    expect(services.keycloak?.environment).not.toHaveProperty('KC_DB_PASSWORD');
  });
});
