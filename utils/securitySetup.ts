import type { ComposeService } from '@/utils/optionalServices';
import { validateSchemaJson } from '@/utils/accessSchemas';
import { publishedPort } from '@/utils/composePorts';
import { readEnvironment } from '@/utils/dockerEnvironment';

export interface LocalKeycloakEndpoint {
  tls: boolean;
  port: number;
}

const KEYCLOAK_HOST = 'keycloak.localhost';
const KEYCLOAK_HTTP_PORT = 8080;
const KEYCLOAK_HTTPS_PORT = 8443;
const KEYCLOAK_REALM_PATH = '/realms/basyx';
const LOCAL_KEYCLOAK_ISSUER_PATTERN = /^(https?):\/\/keycloak\.localhost:(\d+)\/realms\/basyx$/;

export function defaultLocalKeycloakEndpoint(tls: boolean): LocalKeycloakEndpoint {
  return { tls, port: tls ? KEYCLOAK_HTTPS_PORT : KEYCLOAK_HTTP_PORT };
}

export function localKeycloakOrigin(endpoint: LocalKeycloakEndpoint): string {
  return `${endpoint.tls ? 'https' : 'http'}://${KEYCLOAK_HOST}:${endpoint.port}`;
}

export function localKeycloakIssuer(
  endpoint: LocalKeycloakEndpoint = defaultLocalKeycloakEndpoint(false)
): string {
  return `${localKeycloakOrigin(endpoint)}${KEYCLOAK_REALM_PATH}`;
}

export const LOCAL_KEYCLOAK_ISSUER = localKeycloakIssuer();
export const LOCAL_KEYCLOAK_TLS_ISSUER = localKeycloakIssuer(defaultLocalKeycloakEndpoint(true));
export const LOCAL_KEYCLOAK_DISCOVERY_URL = `${LOCAL_KEYCLOAK_ISSUER}/.well-known/openid-configuration`;
export const LOCAL_KEYCLOAK_AUDIENCE = 'basyx-aas-environment';
export const LEGACY_LOCAL_KEYCLOAK_AUDIENCE = 'discovery-service';
export const LOCAL_KEYCLOAK_CERTIFICATE = 'keycloak/tls/keycloak.crt';
export const LOCAL_REBAC_ADMIN_GROUP = 'basyx-admins';

// Keycloak 26.0 replaces the realm default client scopes of dynamically registered clients with
// the requested scopes, so MCP clients would receive tokens without the BaSyx audience.
const KEYCLOAK_IMAGE = 'keycloak/keycloak:26.8.1';
const LEGACY_KEYCLOAK_IMAGE = 'keycloak/keycloak:26.0.6';
const KEYCLOAK_TLS_MOUNT = './keycloak/tls:/opt/keycloak/conf/tls:ro';
const KEYCLOAK_CERTIFICATE_SERVICE = 'keycloak-certificate';
const KEYCLOAK_KEY_STORE_FILE = '/opt/keycloak/conf/tls/keycloak.p12';
const KEYCLOAK_CERTIFICATE_SCRIPT = `set -e
if [ ! -f /tls/keycloak.p12 ]; then
  keytool -genkeypair -alias keycloak -keyalg RSA -keysize 2048 -validity 825 \\
    -dname CN=keycloak.localhost -ext san=dns:keycloak.localhost,dns:localhost,ip:127.0.0.1 \\
    -ext bc:c=ca:true -storetype PKCS12 -keystore /tls/keycloak.p12 -storepass password
  keytool -exportcert -rfc -alias keycloak -keystore /tls/keycloak.p12 -storepass password \\
    -file /tls/keycloak.crt
  chmod 644 /tls/keycloak.p12 /tls/keycloak.crt
fi
`;

// Inside Docker, Keycloak is reached on its HTTP container port. Any other issuer needs the
// internal discovery URL and a fixed frontend URL with a dynamic backchannel.
function usesInternalDiscovery(endpoint: LocalKeycloakEndpoint): boolean {
  return endpoint.tls || endpoint.port !== KEYCLOAK_HTTP_PORT;
}

export function localKeycloakEndpointOfIssuer(issuer: unknown): LocalKeycloakEndpoint | undefined {
  const match =
    typeof issuer === 'string' ? issuer.trim().match(LOCAL_KEYCLOAK_ISSUER_PATTERN) : null;
  return match ? { tls: match[1] === 'https', port: Number(match[2]) } : undefined;
}

export const DEFAULT_POLICY = JSON.stringify(
  {
    AllAccessPermissionRules: {
      DEFATTRIBUTES: [
        { name: 'anonymous_attr', attributes: [{ GLOBAL: 'ANONYMOUS' }] },
        { name: 'role_attr', attributes: [{ CLAIM: 'role' }] },
      ],
      DEFOBJECTS: [
        { name: 'description', objects: [{ ROUTE: '/description' }] },
        { name: 'all_api', objects: [{ ROUTE: '/*' }] },
      ],
      DEFACLS: [
        {
          name: 'public_read',
          acl: { USEATTRIBUTES: 'anonymous_attr', RIGHTS: ['READ'], ACCESS: 'ALLOW' },
        },
        {
          name: 'admin_full',
          acl: { USEATTRIBUTES: 'role_attr', RIGHTS: ['ALL'], ACCESS: 'ALLOW' },
        },
      ],
      DEFFORMULAS: [
        {
          name: 'is_admin',
          formula: { $eq: [{ $attribute: { CLAIM: 'role' } }, { $strVal: 'admin' }] },
        },
      ],
      rules: [
        { USEACL: 'public_read', USEOBJECTS: ['description'], FORMULA: { $boolean: true } },
        { USEACL: 'admin_full', USEOBJECTS: ['all_api'], USEFORMULA: 'is_admin' },
      ],
    },
  },
  null,
  2
);

export function defaultTrustList(
  issuer = LOCAL_KEYCLOAK_ISSUER,
  audience = LOCAL_KEYCLOAK_AUDIENCE
): string {
  const endpoint = localKeycloakEndpointOfIssuer(issuer);
  const discoveryUrl =
    endpoint && usesInternalDiscovery(endpoint)
      ? { discoveryUrl: LOCAL_KEYCLOAK_DISCOVERY_URL }
      : {};
  return JSON.stringify(
    [{ issuer, ...discoveryUrl, audience, scopes: ['email', 'profile'] }],
    null,
    2
  );
}

interface TrustListEntry {
  issuer?: unknown;
  discoveryUrl?: unknown;
  [key: string]: unknown;
}

export function isLocalKeycloakAudience(audience: unknown): boolean {
  return audience === LOCAL_KEYCLOAK_AUDIENCE || audience === LEGACY_LOCAL_KEYCLOAK_AUDIENCE;
}

export function isLocalKeycloakIssuer(issuer: unknown): boolean {
  return localKeycloakEndpointOfIssuer(issuer) !== undefined;
}

function withLocalKeycloakTrustEntry(
  entry: TrustListEntry,
  endpoint: LocalKeycloakEndpoint
): TrustListEntry {
  if (!isLocalKeycloakIssuer(entry.issuer)) return entry;
  const { discoveryUrl, ...rest } = entry;
  const keptDiscoveryUrl = discoveryUrl === LOCAL_KEYCLOAK_DISCOVERY_URL ? {} : { discoveryUrl };
  const localDiscoveryUrl = usesInternalDiscovery(endpoint)
    ? { discoveryUrl: LOCAL_KEYCLOAK_DISCOVERY_URL }
    : {};
  return {
    ...rest,
    issuer: localKeycloakIssuer(endpoint),
    ...(isLocalKeycloakAudience(rest.audience) ? { audience: LOCAL_KEYCLOAK_AUDIENCE } : {}),
    ...(discoveryUrl === undefined ? {} : keptDiscoveryUrl),
    ...localDiscoveryUrl,
  };
}

export function withLocalKeycloakTrustList(
  trustListJson: string,
  endpoint: LocalKeycloakEndpoint
): string {
  let entries: unknown;
  try {
    entries = JSON.parse(trustListJson);
  } catch {
    return trustListJson;
  }
  if (!Array.isArray(entries)) return trustListJson;
  const updated = entries.map(entry =>
    entry && typeof entry === 'object' ? withLocalKeycloakTrustEntry(entry, endpoint) : entry
  );
  return JSON.stringify(updated) === JSON.stringify(entries)
    ? trustListJson
    : JSON.stringify(updated, null, 2);
}

export function withLocalKeycloakIssuer(issuer: string, endpoint: LocalKeycloakEndpoint): string {
  return isLocalKeycloakIssuer(issuer) ? localKeycloakIssuer(endpoint) : issuer;
}

export function validatePolicy(input: string): string | undefined {
  return validateSchemaJson(input, 'policy');
}

export function validateTrustList(input: string): string | undefined {
  return validateSchemaJson(input, 'trust-list');
}

export function defaultReBACAdministrators(issuer = LOCAL_KEYCLOAK_ISSUER): string {
  return `${issuer.trim()}|group:${LOCAL_REBAC_ADMIN_GROUP}`;
}

export function parseReBACAdministrators(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map(entry => entry.trim())
    .filter(Boolean);
}

export function withLocalKeycloakReBACAdministrators(
  input: string,
  endpoint: LocalKeycloakEndpoint
): string {
  return parseReBACAdministrators(input)
    .map(entry => {
      const separator = entry.indexOf('|');
      if (separator < 0) return entry;
      return `${withLocalKeycloakIssuer(entry.slice(0, separator), endpoint)}${entry.slice(separator)}`;
    })
    .join(',');
}

function isValidReBACAdministrator(entry: string): boolean {
  const separator = entry.indexOf('|');
  if (separator < 0) return false;
  const issuer = entry.slice(0, separator).trim();
  const principal = entry.slice(separator + 1).trim();
  const group = principal.startsWith('group:')
    ? principal.slice('group:'.length).trim()
    : principal;
  return Boolean(issuer && principal && group);
}

export function validateReBACAdministrators(input: string): string | undefined {
  const invalid = parseReBACAdministrators(input).find(entry => !isValidReBACAdministrator(entry));
  return invalid
    ? `Invalid administrator "${invalid}". Use issuer|subject or issuer|group:<name>.`
    : undefined;
}

export function localKeycloakService(
  database: {
    host: string;
    port: string;
    name: string;
    user: string;
    password: string;
    local: boolean;
  },
  tls = false,
  port = defaultLocalKeycloakEndpoint(tls).port
): Record<string, ComposeService> {
  return withLocalKeycloakTls(
    {
      keycloak: {
        image: KEYCLOAK_IMAGE,
        command: ['start-dev', '--import-realm', '--health-enabled=true'],
        environment: {
          KC_DB: 'postgres',
          KC_DB_URL: `jdbc:postgresql://${database.host}:${database.port}/${database.name}`,
          KC_DB_USERNAME: database.user,
          KC_DB_PASSWORD: database.password,
          KC_HOSTNAME: 'keycloak.localhost',
          KC_HTTP_ENABLED: 'true',
          KC_HEALTH_ENABLED: 'true',
          KC_HOSTNAME_STRICT: 'false',
          KC_HOSTNAME_STRICT_BACKCHANNEL: 'false',
        },
        ports: [keycloakPortMapping({ tls, port })],
        networks: { default: { aliases: ['keycloak.localhost'] } },
        volumes: [
          './keycloak/realm:/opt/keycloak/data/import:ro',
          ...(tls ? [KEYCLOAK_TLS_MOUNT] : []),
        ],
        ...(database.local ? { depends_on: { db: { condition: 'service_healthy' } } } : {}),
        restart: 'unless-stopped',
      },
    },
    tls
  );
}

function keycloakEnvironment(service: ComposeService): Record<string, string> {
  return Array.isArray(service.environment)
    ? readEnvironment(service.environment)
    : { ...service.environment };
}

function keycloakCertificateService(): ComposeService {
  return {
    image: KEYCLOAK_IMAGE,
    user: '0',
    entrypoint: ['sh', '-c'],
    command: [KEYCLOAK_CERTIFICATE_SCRIPT],
    volumes: ['./keycloak/tls:/tls'],
  };
}

function currentKeycloakImage(image: unknown): unknown {
  return image === LEGACY_KEYCLOAK_IMAGE ? KEYCLOAK_IMAGE : image;
}

function usesKeycloakTls(service: ComposeService): boolean {
  return (service.volumes || []).includes(KEYCLOAK_TLS_MOUNT);
}

function keycloakPortMapping(endpoint: LocalKeycloakEndpoint): string {
  return `127.0.0.1:${endpoint.port}:${endpoint.tls ? KEYCLOAK_HTTPS_PORT : KEYCLOAK_HTTP_PORT}`;
}

// A custom port mapping is kept while the TLS mode stays; switching the mode publishes its default port.
function keycloakPorts(service: ComposeService, tls: boolean): unknown[] {
  if (usesKeycloakTls(service) === tls && Array.isArray(service.ports) && service.ports.length) {
    return service.ports;
  }
  return [keycloakPortMapping(defaultLocalKeycloakEndpoint(tls))];
}

export function localKeycloakEndpoint(
  service: ComposeService | undefined
): LocalKeycloakEndpoint | undefined {
  if (!service) return undefined;
  const tls = usesKeycloakTls(service);
  const port = Array.isArray(service.ports) ? publishedPort(service.ports[0]) : undefined;
  return { tls, port: port ?? defaultLocalKeycloakEndpoint(tls).port };
}

function keycloakHostnameEnvironment(endpoint: LocalKeycloakEndpoint): Record<string, string> {
  if (!usesInternalDiscovery(endpoint)) return { KC_HOSTNAME: KEYCLOAK_HOST };
  return {
    KC_HOSTNAME: localKeycloakOrigin(endpoint),
    KC_HOSTNAME_BACKCHANNEL_DYNAMIC: 'true',
    ...(endpoint.tls ? { KC_HTTPS_KEY_STORE_FILE: KEYCLOAK_KEY_STORE_FILE } : {}),
  };
}

function withKeycloakTlsSettings(service: ComposeService, tls: boolean): ComposeService {
  const environment = keycloakEnvironment(service);
  delete environment.KC_HOSTNAME_BACKCHANNEL_DYNAMIC;
  delete environment.KC_HTTPS_KEY_STORE_FILE;
  const dependencies = Object.fromEntries(
    Object.entries(service.depends_on || {}).filter(
      ([name]) => name !== KEYCLOAK_CERTIFICATE_SERVICE
    )
  );
  const volumes = (service.volumes || []).filter(volume => volume !== KEYCLOAK_TLS_MOUNT);
  if (tls) {
    dependencies[KEYCLOAK_CERTIFICATE_SERVICE] = { condition: 'service_completed_successfully' };
    volumes.push(KEYCLOAK_TLS_MOUNT);
  }
  const ports = keycloakPorts(service, tls);
  const port = publishedPort(ports[0]) ?? defaultLocalKeycloakEndpoint(tls).port;
  const updated: ComposeService = {
    ...service,
    image: currentKeycloakImage(service.image),
    environment: { ...environment, ...keycloakHostnameEnvironment({ tls, port }) },
    ports,
    volumes,
    depends_on: dependencies,
  };
  if (!Object.keys(dependencies).length) delete updated.depends_on;
  return updated;
}

export function withLocalKeycloakTls(
  services: Record<string, ComposeService>,
  tls: boolean
): Record<string, ComposeService> {
  const keycloak = services.keycloak;
  if (!keycloak) return services;
  const updated = Object.fromEntries(
    Object.entries(services).filter(([name]) => name !== KEYCLOAK_CERTIFICATE_SERVICE)
  );
  updated.keycloak = withKeycloakTlsSettings(keycloak, tls);
  if (tls) updated[KEYCLOAK_CERTIFICATE_SERVICE] = keycloakCertificateService();
  return updated;
}

const TOKEN_CLAIMS = {
  'access.token.claim': 'true',
  'id.token.claim': 'true',
  'userinfo.token.claim': 'true',
};

interface OidcMapper {
  name: string;
  protocol: string;
  protocolMapper: string;
  config: Record<string, string>;
}

interface ClientScope {
  name: string;
  protocol: string;
  attributes: Record<string, string>;
  protocolMappers: OidcMapper[];
}

interface RegistrationPolicy {
  name: string;
  providerId: string;
  subType: 'anonymous' | 'authenticated';
  config?: Record<string, string[]>;
}

function oidcMapper(
  name: string,
  protocolMapper: string,
  config: Record<string, string> = {}
): OidcMapper {
  return { name, protocol: 'openid-connect', protocolMapper, config };
}

function attributeMapper(name: string, attribute: string, claim: string): OidcMapper {
  return oidcMapper(name, 'oidc-usermodel-attribute-mapper', {
    'user.attribute': attribute,
    'claim.name': claim,
    'jsonType.label': 'String',
    ...TOKEN_CLAIMS,
  });
}

// Current Keycloak releases only add an included.client.audience for existing clients, so the
// audience is set as a custom value.
function basyxProtocolMappers(): OidcMapper[] {
  return [
    attributeMapper('role', 'role', 'role'),
    oidcMapper('groups', 'oidc-group-membership-mapper', {
      'full.path': 'false',
      'claim.name': 'groups',
      ...TOKEN_CLAIMS,
    }),
    oidcMapper('audience', 'oidc-audience-mapper', {
      'included.custom.audience': LOCAL_KEYCLOAK_AUDIENCE,
      'access.token.claim': 'true',
    }),
  ];
}

function clientScope(
  name: string,
  attributes: Record<string, string>,
  protocolMappers: OidcMapper[] = []
): ClientScope {
  return { name, protocol: 'openid-connect', attributes, protocolMappers };
}

const HIDDEN_SCOPE = { 'include.in.token.scope': 'false', 'display.on.consent.screen': 'false' };
const ALLOWED_PROTOCOL_MAPPER_TYPES = [
  'oidc-full-name-mapper',
  'oidc-sha256-pairwise-sub-mapper',
  'oidc-address-mapper',
  'saml-user-property-mapper',
  'oidc-usermodel-property-mapper',
  'saml-role-list-mapper',
  'saml-user-attribute-mapper',
  'oidc-usermodel-attribute-mapper',
];

// Defining client scopes and registration policies replaces Keycloak's defaults,
// so the defaults that the Web UI and MCP clients rely on are listed explicitly.
function mcpClientScopes(): ClientScope[] {
  return [
    clientScope('basic', HIDDEN_SCOPE, [
      oidcMapper('sub', 'oidc-sub-mapper', { 'access.token.claim': 'true' }),
      oidcMapper('auth_time', 'oidc-usersessionmodel-note-mapper', {
        'user.session.note': 'AUTH_TIME',
        'claim.name': 'auth_time',
        'jsonType.label': 'long',
        'access.token.claim': 'true',
        'id.token.claim': 'true',
      }),
    ]),
    clientScope(
      'profile',
      {
        'include.in.token.scope': 'true',
        'display.on.consent.screen': 'true',
        'consent.screen.text': '${profileScopeConsentText}',
      },
      [
        attributeMapper('username', 'username', 'preferred_username'),
        attributeMapper('given name', 'firstName', 'given_name'),
        attributeMapper('family name', 'lastName', 'family_name'),
        oidcMapper('full name', 'oidc-full-name-mapper', TOKEN_CLAIMS),
      ]
    ),
    clientScope(
      'email',
      {
        'include.in.token.scope': 'true',
        'display.on.consent.screen': 'true',
        'consent.screen.text': '${emailScopeConsentText}',
      },
      [
        attributeMapper('email', 'email', 'email'),
        oidcMapper('email verified', 'oidc-usermodel-property-mapper', {
          'user.attribute': 'emailVerified',
          'claim.name': 'email_verified',
          'jsonType.label': 'boolean',
          ...TOKEN_CLAIMS,
        }),
      ]
    ),
    clientScope(
      'roles',
      {
        'include.in.token.scope': 'false',
        'display.on.consent.screen': 'true',
        'consent.screen.text': '${rolesScopeConsentText}',
      },
      [
        oidcMapper('realm roles', 'oidc-usermodel-realm-role-mapper', {
          'claim.name': 'realm_access.roles',
          'jsonType.label': 'String',
          multivalued: 'true',
          'access.token.claim': 'true',
        }),
        oidcMapper('client roles', 'oidc-usermodel-client-role-mapper', {
          'claim.name': 'resource_access.${client_id}.roles',
          'jsonType.label': 'String',
          multivalued: 'true',
          'access.token.claim': 'true',
        }),
        oidcMapper('audience resolve', 'oidc-audience-resolve-mapper'),
      ]
    ),
    clientScope('web-origins', HIDDEN_SCOPE, [
      oidcMapper('allowed web origins', 'oidc-allowed-origins-mapper', {
        'access.token.claim': 'true',
      }),
    ]),
    clientScope('acr', HIDDEN_SCOPE, [
      oidcMapper('acr loa level', 'oidc-acr-mapper', {
        'access.token.claim': 'true',
        'id.token.claim': 'true',
      }),
    ]),
    clientScope('offline_access', {
      'display.on.consent.screen': 'true',
      'consent.screen.text': '${offlineAccessScopeConsentText}',
    }),
    clientScope(
      'basyx',
      {
        'include.in.token.scope': 'false',
        'display.on.consent.screen': 'true',
        'consent.screen.text': 'Access BaSyx with your roles and groups',
      },
      basyxProtocolMappers()
    ),
  ];
}

function registrationPolicy(
  name: string,
  providerId: string,
  subType: 'anonymous' | 'authenticated',
  config?: Record<string, string[]>
): RegistrationPolicy {
  return { name, providerId, subType, ...(config ? { config } : {}) };
}

function mcpRegistrationPolicies(): RegistrationPolicy[] {
  return [
    registrationPolicy('Trusted Hosts', 'trusted-hosts', 'anonymous', {
      'trusted-hosts': ['localhost', '127.0.0.1'],
      'host-sending-registration-request-must-match': ['false'],
      'client-uris-must-match': ['true'],
    }),
    registrationPolicy('Consent Required', 'consent-required', 'anonymous'),
    registrationPolicy('Full Scope Disabled', 'scope', 'anonymous'),
    registrationPolicy('Max Clients Limit', 'max-clients', 'anonymous', {
      'max-clients': ['200'],
    }),
    registrationPolicy('Allowed Client Scopes', 'allowed-client-templates', 'anonymous', {
      'allow-default-scopes': ['true'],
      'allowed-client-scopes': ['openid'],
    }),
    registrationPolicy('Allowed Protocol Mapper Types', 'allowed-protocol-mappers', 'anonymous', {
      'allowed-protocol-mapper-types': ALLOWED_PROTOCOL_MAPPER_TYPES,
    }),
    registrationPolicy('Allowed Client Scopes', 'allowed-client-templates', 'authenticated', {
      'allow-default-scopes': ['true'],
    }),
    registrationPolicy(
      'Allowed Protocol Mapper Types',
      'allowed-protocol-mappers',
      'authenticated',
      { 'allowed-protocol-mapper-types': ALLOWED_PROTOCOL_MAPPER_TYPES }
    ),
  ];
}

function mcpRealmSettings(): Record<string, unknown> {
  return {
    clientScopes: mcpClientScopes(),
    defaultDefaultClientScopes: [
      'basic',
      'profile',
      'email',
      'roles',
      'web-origins',
      'acr',
      'basyx',
    ],
    defaultOptionalClientScopes: ['offline_access'],
    scopeMappings: [{ clientScope: 'offline_access', roles: ['offline_access'] }],
    components: {
      'org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy':
        mcpRegistrationPolicies(),
    },
  };
}

export function createLocalRealm(
  adminPassword: string,
  uiOrigin: string,
  clientId = 'basyx-ui',
  mcpSignIn = false
): string {
  const origin = new URL(uiOrigin).origin;
  return JSON.stringify(
    {
      realm: 'basyx',
      enabled: true,
      sslRequired: 'external',
      ...(mcpSignIn ? mcpRealmSettings() : {}),
      clients: [
        {
          clientId,
          enabled: true,
          protocol: 'openid-connect',
          publicClient: true,
          standardFlowEnabled: true,
          directAccessGrantsEnabled: false,
          redirectUris: [`${origin}/*`],
          webOrigins: [origin],
          ...(mcpSignIn ? {} : { protocolMappers: basyxProtocolMappers() }),
        },
      ],
      groups: [{ name: LOCAL_REBAC_ADMIN_GROUP }],
      users: [
        {
          username: 'basyx-admin',
          enabled: true,
          attributes: { role: ['admin'] },
          groups: [`/${LOCAL_REBAC_ADMIN_GROUP}`],
          ...(mcpSignIn ? { realmRoles: ['offline_access'] } : {}),
          credentials: [{ type: 'password', value: adminPassword, temporary: true }],
        },
      ],
    },
    null,
    2
  );
}
