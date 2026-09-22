import type { ComposeService } from '@/utils/optionalServices';
import { validateSchemaJson } from '@/utils/accessSchemas';

export const DEFAULT_POLICY = JSON.stringify(
  {
    AllAccessPermissionRules: {
      DEFATTRIBUTES: [{ name: 'role_attr', attributes: [{ CLAIM: 'role' }] }],
      DEFOBJECTS: [{ name: 'all_api', objects: [{ ROUTE: '/*' }] }],
      DEFACLS: [
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
      rules: [{ USEACL: 'admin_full', USEOBJECTS: ['all_api'], USEFORMULA: 'is_admin' }],
    },
  },
  null,
  2
);

export function defaultTrustList(
  issuer = 'http://keycloak.localhost:8080/realms/basyx',
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
      users: [
        {
          username: 'basyx-admin',
          enabled: true,
          attributes: { role: ['admin'] },
          credentials: [{ type: 'password', value: adminPassword, temporary: true }],
        },
      ],
    },
    null,
    2
  );
}
