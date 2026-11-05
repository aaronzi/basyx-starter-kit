import JSZip from 'jszip';
import { createPinia, setActivePinia } from 'pinia';
import { useAppStore } from '@/stores/app';
import { decodeConfigHash, encodeConfigHash } from '@/utils/configPersistence';
import { readServiceEnvironment } from '@/utils/dockerEnvironment';
import { createMcpReadme, mcpClientCommands, readMcpSettings } from '@/utils/mcp';
import { updateOptionalServices } from '@/utils/optionalServices';
import {
  createLocalRealm,
  DEFAULT_POLICY,
  defaultLocalKeycloakEndpoint,
  defaultTrustList,
  LOCAL_KEYCLOAK_DISCOVERY_URL,
  LOCAL_KEYCLOAK_ISSUER,
  LOCAL_KEYCLOAK_TLS_ISSUER,
  localKeycloakService,
  validateTrustList,
  withLocalKeycloakReBACAdministrators,
  withLocalKeycloakTls,
  withLocalKeycloakTrustList,
} from '@/utils/securitySetup';
import { addOptionalSetupAssets } from '@/utils/setupAssets';

const HTTP = defaultLocalKeycloakEndpoint(false);
const HTTPS = defaultLocalKeycloakEndpoint(true);

const database = {
  host: 'db',
  port: '5432',
  name: 'basyxTestDB',
  user: 'admin',
  password: 'admin123',
  local: true,
};

interface RealmMapper {
  protocolMapper: string;
  config: Record<string, string>;
}

interface RealmScope {
  name: string;
  protocolMappers: RealmMapper[];
}

interface RegistrationPolicy {
  name: string;
  providerId: string;
  subType: string;
  config?: Record<string, string[]>;
}

function registrationPolicies(realm: {
  components: Record<string, RegistrationPolicy[]>;
}): RegistrationPolicy[] {
  return realm.components[
    'org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy'
  ] as RegistrationPolicy[];
}

describe('MCP sign-in with the local Keycloak', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('serves Keycloak over HTTPS with a generated certificate and reverts cleanly', () => {
    const plain = localKeycloakService(database);
    const services = localKeycloakService(database, true);
    const keycloak = services.keycloak!;

    expect(keycloak.image).toBe('keycloak/keycloak:26.8.1');
    expect(keycloak.environment).toMatchObject({
      KC_HOSTNAME: 'https://keycloak.localhost:8443',
      KC_HOSTNAME_BACKCHANNEL_DYNAMIC: 'true',
      KC_HTTP_ENABLED: 'true',
      KC_HTTPS_KEY_STORE_FILE: '/opt/keycloak/conf/tls/keycloak.p12',
    });
    expect(keycloak.ports).toEqual(['127.0.0.1:8443:8443']);
    expect(keycloak.networks).toEqual({ default: { aliases: ['keycloak.localhost'] } });
    expect(keycloak.volumes).toContain('./keycloak/tls:/opt/keycloak/conf/tls:ro');
    expect(keycloak.depends_on).toEqual({
      db: { condition: 'service_healthy' },
      'keycloak-certificate': { condition: 'service_completed_successfully' },
    });
    const certificate = services['keycloak-certificate']!;
    expect(certificate.volumes).toEqual(['./keycloak/tls:/tls']);
    expect(String((certificate.command as string[])[0])).toContain(
      'san=dns:keycloak.localhost,dns:localhost,ip:127.0.0.1'
    );

    expect(withLocalKeycloakTls(services, false)).toEqual(plain);
    expect(withLocalKeycloakTls(withLocalKeycloakTls(plain, true), true)).toEqual(services);
    expect(withLocalKeycloakTls({ db: {} }, true)).toEqual({ db: {} });
  });

  it('uses Keycloak 26.8.1 and the basyx-aas-environment audience for every local setup', () => {
    const keycloak = localKeycloakService(database).keycloak!;
    expect(keycloak.image).toBe('keycloak/keycloak:26.8.1');
    expect(
      withLocalKeycloakTls({ keycloak: { ...keycloak, image: 'keycloak/keycloak:26.0.6' } }, false)
        .keycloak?.image
    ).toBe('keycloak/keycloak:26.8.1');

    const realm = JSON.parse(createLocalRealm('password', 'http://localhost:3000'));
    expect(realm.clients[0].protocolMappers).toContainEqual(
      expect.objectContaining({
        protocolMapper: 'oidc-audience-mapper',
        config: {
          'included.custom.audience': 'basyx-aas-environment',
          'access.token.claim': 'true',
        },
      })
    );
    expect(JSON.parse(defaultTrustList())[0].audience).toBe('basyx-aas-environment');

    const legacy = JSON.stringify([
      { issuer: LOCAL_KEYCLOAK_ISSUER, audience: 'discovery-service', scopes: ['email'] },
      { issuer: 'https://id.example.test', audience: 'discovery-service' },
    ]);
    expect(JSON.parse(withLocalKeycloakTrustList(legacy, HTTP))).toEqual([
      { issuer: LOCAL_KEYCLOAK_ISSUER, audience: 'basyx-aas-environment', scopes: ['email'] },
      { issuer: 'https://id.example.test', audience: 'discovery-service' },
    ]);
  });

  it('trusts the HTTPS issuer with the internal discovery URL and the BaSyx audience', () => {
    const trustList = defaultTrustList(LOCAL_KEYCLOAK_TLS_ISSUER);
    expect(validateTrustList(trustList)).toBeUndefined();
    expect(JSON.parse(trustList)).toEqual([
      {
        issuer: LOCAL_KEYCLOAK_TLS_ISSUER,
        discoveryUrl: LOCAL_KEYCLOAK_DISCOVERY_URL,
        audience: 'basyx-aas-environment',
        scopes: ['email', 'profile'],
      },
    ]);

    const converted = withLocalKeycloakTrustList(defaultTrustList(), HTTPS);
    expect(JSON.parse(converted)).toEqual(JSON.parse(trustList));
    expect(JSON.parse(withLocalKeycloakTrustList(converted, HTTP))).toEqual(
      JSON.parse(defaultTrustList())
    );
    const external = defaultTrustList('https://id.example.test/realms/basyx');
    expect(withLocalKeycloakTrustList(external, HTTPS)).toBe(external);
    expect(withLocalKeycloakTrustList('{', HTTPS)).toBe('{');
    expect(
      withLocalKeycloakReBACAdministrators(
        `${LOCAL_KEYCLOAK_ISSUER}|group:basyx-admins, https://id.example.test|alice`,
        HTTPS
      )
    ).toBe(`${LOCAL_KEYCLOAK_TLS_ISSUER}|group:basyx-admins,https://id.example.test|alice`);
  });

  it('lets self-registered MCP clients receive the audience, roles, groups and offline tokens', () => {
    const realm = JSON.parse(
      createLocalRealm('password', 'http://localhost:3000', 'basyx-ui', true)
    );

    expect(realm.defaultDefaultClientScopes).toEqual(
      expect.arrayContaining(['basic', 'profile', 'email', 'web-origins', 'basyx'])
    );
    expect(realm.defaultOptionalClientScopes).toEqual(['offline_access']);
    expect(realm.scopeMappings).toEqual([
      { clientScope: 'offline_access', roles: ['offline_access'] },
    ]);
    const scopes = realm.clientScopes as RealmScope[];
    expect(scopes.map(scope => scope.name)).toEqual(
      expect.arrayContaining(realm.defaultDefaultClientScopes.concat('offline_access'))
    );
    const basyx = scopes.find(scope => scope.name === 'basyx')!;
    expect(basyx.protocolMappers.map(mapper => mapper.protocolMapper)).toEqual([
      'oidc-usermodel-attribute-mapper',
      'oidc-group-membership-mapper',
      'oidc-audience-mapper',
    ]);
    expect(basyx.protocolMappers[2]!.config['included.custom.audience']).toBe(
      'basyx-aas-environment'
    );
    expect(realm.clients[0].protocolMappers).toBeUndefined();
    expect(realm.users[0].realmRoles).toEqual(['offline_access']);

    const policies = registrationPolicies(realm);
    expect(policies.find(policy => policy.providerId === 'trusted-hosts')?.config).toEqual({
      'trusted-hosts': ['localhost', '127.0.0.1'],
      'host-sending-registration-request-must-match': ['false'],
      'client-uris-must-match': ['true'],
    });
    const anonymousScopes = policies.find(
      policy => policy.providerId === 'allowed-client-templates' && policy.subType === 'anonymous'
    );
    expect(anonymousScopes?.config?.['allowed-client-scopes']).toEqual(['openid']);
    expect(
      policies
        .filter(policy => policy.subType === 'anonymous')
        .map(policy => policy.providerId)
        .sort()
    ).toEqual([
      'allowed-client-templates',
      'allowed-protocol-mappers',
      'consent-required',
      'max-clients',
      'scope',
      'trusted-hosts',
    ]);

    const webUiRealm = JSON.parse(createLocalRealm('password', 'http://localhost:3000'));
    expect(webUiRealm.clientScopes).toBeUndefined();
    expect(webUiRealm.components).toBeUndefined();
    expect(webUiRealm.users[0].realmRoles).toBeUndefined();
  });

  it('packages the MCP realm and certificate instructions with the local Keycloak', async () => {
    const zip = new JSZip();
    const readme = addOptionalSetupAssets(zip, {
      services: localKeycloakService(database, true),
      environment: { ABAC_ENABLED: 'true', MCP_ENABLED: 'true' },
      policyJson: DEFAULT_POLICY,
      trustListJson: defaultTrustList(LOCAL_KEYCLOAK_TLS_ISSUER),
      uiUrl: 'http://localhost:3000',
      uiClientId: 'basyx-ui',
      adminPassword: 'generated-test-password',
    });
    const realm = JSON.parse(
      (await zip.file('keycloak/realm/basyx-realm.json')?.async('string')) || '{}'
    );
    expect(realm.clientScopes).toBeDefined();
    expect(readme).toContain('Open https://keycloak.localhost:8443');
    expect(readme).toContain(
      'security add-trusted-cert -r trustRoot -p ssl -k ~/Library/Keychains/login.keychain-db keycloak/tls/keycloak.crt'
    );

    const plainReadme = addOptionalSetupAssets(new JSZip(), {
      services: localKeycloakService(database),
      environment: { ABAC_ENABLED: 'true' },
      policyJson: DEFAULT_POLICY,
      trustListJson: defaultTrustList(),
      uiUrl: 'http://localhost:3000',
      uiClientId: 'basyx-ui',
      adminPassword: 'generated-test-password',
    });
    expect(plainReadme).toContain('Open http://keycloak.localhost:8080');
    expect(plainReadme).not.toContain('Trust the Keycloak Certificate');
    expect(plainReadme).toContain('only while the `basyx` realm does not exist');
    expect(plainReadme).toContain('old audience `discovery-service`');
  });

  it('describes the endpoint, client commands and sign-in for each access-control mode', () => {
    const environment = {
      GENERAL_EXTERNALURL: 'http://localhost:8082/api/',
      MCP_ENABLED: 'true',
      ABAC_ENABLED: 'true',
    };
    const local = readMcpSettings(environment, localKeycloakService(database, true, 9443));
    expect(local).toEqual({
      enabled: true,
      writesEnabled: false,
      url: 'http://localhost:8082/api/mcp',
      signIn: 'local-keycloak',
      keycloakIssuer: 'https://keycloak.localhost:9443/realms/basyx',
    });
    expect(createMcpReadme(local)).toContain('(https://keycloak.localhost:9443/realms/basyx)');
    expect(mcpClientCommands(local.url)).toEqual([
      {
        client: 'Claude Code',
        command: 'claude mcp add --transport http basyx http://localhost:8082/api/mcp',
      },
      { client: 'Codex', command: 'codex mcp add basyx --url http://localhost:8082/api/mcp' },
    ]);
    expect(createMcpReadme(local)).toContain('codex mcp login basyx');
    expect(createMcpReadme(local)).toContain('Only read tools are offered');
    expect(readMcpSettings(environment, {}).signIn).toBe('external');
    const open = readMcpSettings({ ...environment, ABAC_ENABLED: 'false' }, {});
    expect(open.signIn).toBe('none');
    expect(createMcpReadme(open)).toContain('has no authentication');
    expect(readMcpSettings({ ...environment, MCP_PATH: '/agents' }, {}).url).toBe(
      'http://localhost:8082/api/agents'
    );
    expect(createMcpReadme({ ...local, enabled: false })).toBe('');
  });

  it('keeps every local issuer consistent when MCP is toggled and after a shared link', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    expect(readServiceEnvironment(store.getDockerComposeConfig?.value)).toMatchObject({
      MCP_ENABLED: 'false',
      MCP_WRITESENABLED: 'false',
    });
    updateOptionalServices(localKeycloakService(database), ['keycloak']);
    store.updateServiceEnvironment('aas-environment', {
      ABAC_ENABLED: 'true',
      MCP_ENABLED: 'true',
      REBAC_ADMINISTRATORS: `${LOCAL_KEYCLOAK_ISSUER}|group:basyx-admins`,
    });
    const infra = JSON.parse(JSON.stringify(store.getBasyxInfraConfig));
    infra.value.infrastructures.infra1.security = {
      type: 'oauth2',
      config: { flow: 'auth_code', issuer: LOCAL_KEYCLOAK_ISSUER, clientId: 'basyx-ui' },
    };
    store.setBasyxInfraConfig(infra);

    store.syncLocalKeycloak();

    const issuer = (): string =>
      (
        store.getBasyxInfraConfig?.value as {
          infrastructures: { infra1: { security: { config: { issuer: string } } } };
        }
      ).infrastructures.infra1.security.config.issuer;
    const services = (): Record<string, unknown> =>
      (store.getDockerComposeConfig?.value as { services: Record<string, unknown> }).services;
    expect(services()['keycloak-certificate']).toBeDefined();
    expect(JSON.parse(store.trustListJson)[0].issuer).toBe(LOCAL_KEYCLOAK_TLS_ISSUER);
    expect(issuer()).toBe(LOCAL_KEYCLOAK_TLS_ISSUER);
    expect(readServiceEnvironment(store.getDockerComposeConfig?.value).REBAC_ADMINISTRATORS).toBe(
      `${LOCAL_KEYCLOAK_TLS_ISSUER}|group:basyx-admins`
    );

    const decoded = decodeConfigHash(
      encodeConfigHash({
        route: '/get-started/download',
        state: store.createSerializableSnapshot(),
      })
    );
    store.reset();
    store.initializeStarterDefaults();
    store.applySerializableSnapshot(decoded.payload?.state);
    expect(JSON.parse(store.trustListJson)[0]).toMatchObject({
      issuer: LOCAL_KEYCLOAK_TLS_ISSUER,
      discoveryUrl: LOCAL_KEYCLOAK_DISCOVERY_URL,
    });

    store.updateServiceEnvironment('aas-environment', { MCP_ENABLED: 'false' });
    store.syncLocalKeycloak();
    expect(services()['keycloak-certificate']).toBeUndefined();
    expect(JSON.parse(store.trustListJson)).toEqual(JSON.parse(defaultTrustList()));
    expect(issuer()).toBe(LOCAL_KEYCLOAK_ISSUER);
  });

  it('keeps a custom Keycloak port after a shared link and follows the TLS mode when it switches', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    updateOptionalServices(localKeycloakService(database), ['keycloak']);
    store.updateServiceEnvironment('aas-environment', { ABAC_ENABLED: 'true' });
    store.setContainerPort('keycloak', 9080);
    const keycloakPorts = (): unknown =>
      (store.getDockerComposeConfig?.value as { services: { keycloak: { ports: unknown } } })
        .services.keycloak.ports;
    expect(keycloakPorts()).toEqual(['127.0.0.1:9080:8080']);

    const decoded = decodeConfigHash(
      encodeConfigHash({
        route: '/get-started/download',
        state: store.createSerializableSnapshot(),
      })
    );
    store.reset();
    store.initializeStarterDefaults();
    store.applySerializableSnapshot(decoded.payload?.state);
    expect(keycloakPorts()).toEqual(['127.0.0.1:9080:8080']);
    expect(store.getContainerPort('keycloak')).toBe(9080);

    store.updateServiceEnvironment('aas-environment', { MCP_ENABLED: 'true' });
    store.syncLocalKeycloak();
    expect(keycloakPorts()).toEqual(['127.0.0.1:8443:8443']);
    expect(store.getContainerPort('keycloak')).toBe(8443);

    store.setContainerPort('keycloak', 9443);
    store.syncLocalKeycloak();
    expect(keycloakPorts()).toEqual(['127.0.0.1:9443:8443']);

    store.updateServiceEnvironment('aas-environment', { MCP_ENABLED: 'false' });
    store.syncLocalKeycloak();
    expect(keycloakPorts()).toEqual(['127.0.0.1:8080:8080']);
    expect(store.getContainerPort('keycloak')).toBe(8080);
  });
});
