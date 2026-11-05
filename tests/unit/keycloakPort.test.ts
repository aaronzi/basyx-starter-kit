import JSZip from 'jszip';
import { createPinia, setActivePinia } from 'pinia';
import { useAppStore } from '@/stores/app';
import { decodeConfigHash, encodeConfigHash } from '@/utils/configPersistence';
import { readServiceEnvironment } from '@/utils/dockerEnvironment';
import { updateOptionalServices } from '@/utils/optionalServices';
import {
  DEFAULT_POLICY,
  defaultTrustList,
  isLocalKeycloakIssuer,
  LOCAL_KEYCLOAK_DISCOVERY_URL,
  LOCAL_KEYCLOAK_ISSUER,
  LOCAL_KEYCLOAK_TLS_ISSUER,
  localKeycloakEndpoint,
  localKeycloakEndpointOfIssuer,
  localKeycloakIssuer,
  localKeycloakService,
  withLocalKeycloakTls,
  withLocalKeycloakTrustList,
} from '@/utils/securitySetup';
import { addOptionalSetupAssets } from '@/utils/setupAssets';

const database = {
  host: 'db',
  port: '5432',
  name: 'basyxTestDB',
  user: 'admin',
  password: 'admin123',
  local: true,
};

interface KeycloakService {
  ports: string[];
  environment: Record<string, string>;
}

function services(): Record<string, KeycloakService> {
  return (
    useAppStore().getDockerComposeConfig?.value as { services: Record<string, KeycloakService> }
  ).services;
}

function infraIssuer(): string {
  return (
    useAppStore().getBasyxInfraConfig?.value as {
      infrastructures: { infra1: { security: { config: { issuer: string } } } };
    }
  ).infrastructures.infra1.security.config.issuer;
}

function trustList(): Record<string, unknown>[] {
  return JSON.parse(useAppStore().trustListJson);
}

function enableLocalAccessControl(): void {
  const store = useAppStore();
  store.initializeStarterDefaults();
  updateOptionalServices(localKeycloakService(database), ['keycloak']);
  store.updateServiceEnvironment('aas-environment', {
    ABAC_ENABLED: 'true',
    REBAC_ADMINISTRATORS: `${LOCAL_KEYCLOAK_ISSUER}|group:basyx-admins`,
  });
  const infra = JSON.parse(JSON.stringify(store.getBasyxInfraConfig));
  infra.value.infrastructures.infra1.security = {
    type: 'oauth2',
    config: { flow: 'auth_code', issuer: LOCAL_KEYCLOAK_ISSUER, clientId: 'basyx-ui' },
  };
  store.setBasyxInfraConfig(infra);
}

function expectLocalIssuer(issuer: string): void {
  expect(infraIssuer()).toBe(issuer);
  expect(trustList()[0]?.issuer).toBe(issuer);
  expect(readServiceEnvironment(useAppStore().getDockerComposeConfig?.value)).toMatchObject({
    REBAC_ADMINISTRATORS: `${issuer}|group:basyx-admins`,
  });
}

describe('local Keycloak on a custom host port', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('derives the issuer, hostname and discovery from the published port', () => {
    const http = localKeycloakService(database, false, 9080).keycloak!;
    expect(http.ports).toEqual(['127.0.0.1:9080:8080']);
    expect(http.environment).toMatchObject({
      KC_HOSTNAME: 'http://keycloak.localhost:9080',
      KC_HOSTNAME_BACKCHANNEL_DYNAMIC: 'true',
    });
    expect(localKeycloakEndpoint(http)).toEqual({ tls: false, port: 9080 });

    const tls = localKeycloakService(database, true, 9443).keycloak!;
    expect(tls.ports).toEqual(['127.0.0.1:9443:8443']);
    expect(tls.environment).toMatchObject({ KC_HOSTNAME: 'https://keycloak.localhost:9443' });
    expect(localKeycloakIssuer(localKeycloakEndpoint(tls))).toBe(
      'https://keycloak.localhost:9443/realms/basyx'
    );

    const plain = localKeycloakService(database).keycloak!;
    expect(plain.environment).toMatchObject({ KC_HOSTNAME: 'keycloak.localhost' });
    expect(plain.environment).not.toHaveProperty('KC_HOSTNAME_BACKCHANNEL_DYNAMIC');
    expect(
      withLocalKeycloakTls({ keycloak: { ...plain, ports: ['127.0.0.1:9080:8080'] } }, false)
        .keycloak
    ).toEqual(http);
  });

  it('recognizes legacy and custom local issuers and only adds discovery when needed', () => {
    for (const issuer of [
      LOCAL_KEYCLOAK_ISSUER,
      LOCAL_KEYCLOAK_TLS_ISSUER,
      'http://keycloak.localhost:9080/realms/basyx',
    ]) {
      expect(isLocalKeycloakIssuer(issuer), issuer).toBe(true);
    }
    expect(isLocalKeycloakIssuer('https://keycloak.example.test:8443/realms/basyx')).toBe(false);
    expect(localKeycloakEndpointOfIssuer(' https://keycloak.localhost:9443/realms/basyx ')).toEqual(
      { tls: true, port: 9443 }
    );
    expect(JSON.parse(defaultTrustList())[0]).not.toHaveProperty('discoveryUrl');
    expect(
      JSON.parse(defaultTrustList('http://keycloak.localhost:9080/realms/basyx'))[0]
    ).toMatchObject({ discoveryUrl: LOCAL_KEYCLOAK_DISCOVERY_URL });
    const moved = withLocalKeycloakTrustList(defaultTrustList(), { tls: false, port: 9080 });
    expect(JSON.parse(moved)[0]).toMatchObject({
      issuer: 'http://keycloak.localhost:9080/realms/basyx',
      discoveryUrl: LOCAL_KEYCLOAK_DISCOVERY_URL,
    });
    expect(withLocalKeycloakTrustList(moved, { tls: false, port: 8080 })).toBe(defaultTrustList());
  });

  it('moves every local issuer when the Keycloak port changes after access control', () => {
    enableLocalAccessControl();
    const store = useAppStore();

    store.setContainerPort('keycloak', 9080);
    expect(services().keycloak?.environment.KC_HOSTNAME).toBe('http://keycloak.localhost:9080');
    expectLocalIssuer('http://keycloak.localhost:9080/realms/basyx');
    expect(trustList()[0]?.discoveryUrl).toBe(LOCAL_KEYCLOAK_DISCOVERY_URL);

    store.updateServiceEnvironment('aas-environment', { MCP_ENABLED: 'true' });
    store.syncLocalKeycloak();
    expectLocalIssuer(LOCAL_KEYCLOAK_TLS_ISSUER);
    store.setContainerPort('keycloak', 9443);
    expect(services().keycloak?.environment.KC_HOSTNAME).toBe('https://keycloak.localhost:9443');
    expectLocalIssuer('https://keycloak.localhost:9443/realms/basyx');

    store.updateServiceEnvironment('aas-environment', { MCP_ENABLED: 'false' });
    store.syncLocalKeycloak();
    expectLocalIssuer(LOCAL_KEYCLOAK_ISSUER);
    expect(services().keycloak?.environment.KC_HOSTNAME).toBe('keycloak.localhost');
    expect(trustList()).toEqual(JSON.parse(defaultTrustList()));
  });

  it('restores a shared custom port with consistent issuers', () => {
    enableLocalAccessControl();
    const store = useAppStore();
    store.updateServiceEnvironment('aas-environment', { MCP_ENABLED: 'true' });
    store.syncLocalKeycloak();
    store.setContainerPort('keycloak', 9443);

    const decoded = decodeConfigHash(
      encodeConfigHash({
        route: '/get-started/download',
        state: store.createSerializableSnapshot(),
      })
    );
    store.reset();
    store.initializeStarterDefaults();
    store.applySerializableSnapshot(decoded.payload?.state);

    expect(services().keycloak?.ports).toEqual(['127.0.0.1:9443:8443']);
    expect(store.getContainerPort('keycloak')).toBe(9443);
    expectLocalIssuer('https://keycloak.localhost:9443/realms/basyx');
    expect(trustList()[0]?.discoveryUrl).toBe(LOCAL_KEYCLOAK_DISCOVERY_URL);
  });

  it('documents the custom Keycloak URL in the README', () => {
    const readme = addOptionalSetupAssets(new JSZip(), {
      services: localKeycloakService(database, true, 9443),
      environment: { ABAC_ENABLED: 'true', MCP_ENABLED: 'true' },
      policyJson: DEFAULT_POLICY,
      trustListJson: defaultTrustList('https://keycloak.localhost:9443/realms/basyx'),
      uiUrl: 'http://localhost:3000',
      uiClientId: 'basyx-ui',
      adminPassword: 'generated-test-password',
    });
    expect(readme).toContain('Open https://keycloak.localhost:9443 and');
    expect(readme).toContain('serves HTTPS on port 9443');
  });
});
