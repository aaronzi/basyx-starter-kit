import type { ComposeService } from '@/utils/optionalServices';
import { validateSchemaJson } from '@/utils/accessSchemas';

export const LOCAL_KEYCLOAK_ISSUER = 'http://keycloak.localhost:8080/realms/basyx';
export const LOCAL_REBAC_ADMIN_GROUP = 'basyx-admins';

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
  audience = 'discovery-service'
): string {
  return JSON.stringify([{ issuer, audience, scopes: ['email', 'profile'] }], null, 2);
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

export function validateReBACAdministrators(input: string): string | undefined {
  const invalid = parseReBACAdministrators(input).find(entry => {
    const [issuer, principal, ...rest] = entry.split('|').map(part => part.trim());
    return !issuer || !principal || rest.length > 0 || principal === 'group:';
  });
  return invalid
    ? `Invalid administrator "${invalid}". Use issuer|subject or issuer|group:<name>.`
    : undefined;
}

export function localKeycloakService(database: {
  host: string;
  port: string;
  name: string;
  user: string;
  password: string;
  local: boolean;
}): Record<string, ComposeService> {
  return {
    keycloak: {
      image: 'keycloak/keycloak:26.0.6',
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
      ports: ['127.0.0.1:8080:8080'],
      networks: { default: { aliases: ['keycloak.localhost'] } },
      volumes: ['./keycloak/realm:/opt/keycloak/data/import:ro'],
      ...(database.local ? { depends_on: { db: { condition: 'service_healthy' } } } : {}),
      restart: 'unless-stopped',
    },
  };
}

export function createLocalRealm(
  adminPassword: string,
  uiOrigin: string,
  clientId = 'basyx-ui'
): string {
  const origin = new URL(uiOrigin).origin;
  return JSON.stringify(
    {
      realm: 'basyx',
      enabled: true,
      sslRequired: 'external',
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
          protocolMappers: [
            {
              name: 'role',
              protocol: 'openid-connect',
              protocolMapper: 'oidc-usermodel-attribute-mapper',
              config: {
                'user.attribute': 'role',
                'claim.name': 'role',
                'jsonType.label': 'String',
                'access.token.claim': 'true',
                'id.token.claim': 'true',
                'userinfo.token.claim': 'true',
              },
            },
            {
              name: 'groups',
              protocol: 'openid-connect',
              protocolMapper: 'oidc-group-membership-mapper',
              config: {
                'full.path': 'false',
                'claim.name': 'groups',
                'access.token.claim': 'true',
                'id.token.claim': 'true',
                'userinfo.token.claim': 'true',
              },
            },
            {
              name: 'audience',
              protocol: 'openid-connect',
              protocolMapper: 'oidc-audience-mapper',
              config: {
                'included.client.audience': 'discovery-service',
                'access.token.claim': 'true',
              },
            },
          ],
        },
      ],
      groups: [{ name: LOCAL_REBAC_ADMIN_GROUP }],
      users: [
        {
          username: 'basyx-admin',
          enabled: true,
          attributes: { role: ['admin'] },
          groups: [`/${LOCAL_REBAC_ADMIN_GROUP}`],
          credentials: [{ type: 'password', value: adminPassword, temporary: true }],
        },
      ],
    },
    null,
    2
  );
}
