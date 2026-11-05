import type { ComposeService } from '@/utils/optionalServices';
import { envBoolean } from '@/utils/dockerEnvironment';
import { joinBaseUrl } from '@/utils/externalUrls';
import {
  LOCAL_KEYCLOAK_CERTIFICATE,
  localKeycloakEndpoint,
  localKeycloakIssuer,
} from '@/utils/securitySetup';

export const MCP_SERVER_NAME = 'basyx';
export const DEFAULT_MCP_PATH = '/mcp';

export type McpSignIn = 'none' | 'local-keycloak' | 'external';

export interface McpSettings {
  enabled: boolean;
  writesEnabled: boolean;
  url: string;
  signIn: McpSignIn;
  keycloakIssuer?: string;
}

export interface McpClientCommand {
  client: string;
  command: string;
}

export function readMcpSettings(
  environment: Record<string, string>,
  services: Record<string, unknown>
): McpSettings {
  const accessControl = envBoolean(environment.ABAC_ENABLED);
  const keycloak = localKeycloakEndpoint(services.keycloak as ComposeService | undefined);
  return {
    enabled: envBoolean(environment.MCP_ENABLED),
    writesEnabled: envBoolean(environment.MCP_WRITESENABLED),
    url: joinBaseUrl(
      environment.GENERAL_EXTERNALURL || '',
      environment.MCP_PATH?.trim() || DEFAULT_MCP_PATH
    ),
    signIn: !accessControl ? 'none' : keycloak ? 'local-keycloak' : 'external',
    ...(accessControl && keycloak ? { keycloakIssuer: localKeycloakIssuer(keycloak) } : {}),
  };
}

export function mcpClientCommands(url: string): McpClientCommand[] {
  return [
    {
      client: 'Claude Code',
      command: `claude mcp add --transport http ${MCP_SERVER_NAME} ${url}`,
    },
    { client: 'Codex', command: `codex mcp add ${MCP_SERVER_NAME} --url ${url}` },
  ];
}

const SIGN_IN_NOTES: Record<McpSignIn, (settings: McpSettings) => string> = {
  none: () => `The endpoint has no authentication because access control is disabled. Do not expose it,
and do not enable write tools on an endpoint that others can reach.`,
  'local-keycloak':
    settings => `Clients sign in at the local Keycloak (${settings.keycloakIssuer}). Trust its certificate
first, as described under Local Keycloak. In Claude Code, run \`/mcp\`, select \`${MCP_SERVER_NAME}\` and choose
*Authenticate*. In Codex, run \`codex mcp login ${MCP_SERVER_NAME}\`. The clients register themselves with a
loopback redirect URI, and every tool call runs with the signed-in user's permissions. If a client
rejects the certificate, start it with \`NODE_EXTRA_CA_CERTS=$PWD/${LOCAL_KEYCLOAK_CERTIFICATE}\`.`,
  external:
    () => `Clients sign in at the identity provider of the trust list. It must serve HTTPS with a trusted
certificate, support the authorization code flow with PKCE, let clients register themselves
(dynamic client registration) or provide a registered public client (\`--client-id\`), and put the
trust-list audience into the access tokens. Every tool call runs with the signed-in user's
permissions.`,
};

export function createMcpReadme(settings: McpSettings): string {
  if (!settings.enabled) return '';
  const commands = mcpClientCommands(settings.url)
    .map(({ client, command }) => `${client}:\n\`\`\`\n${command}\n\`\`\``)
    .join('\n\n');
  const writes = settings.writesEnabled
    ? 'Write tools are enabled: clients can create, change and delete shells, submodels and submodel elements.'
    : 'Only read tools are offered. Set `MCP_WRITESENABLED=true` to offer the write tools.';
  return `
## MCP Endpoint (experimental)

The AAS Environment serves a Model Context Protocol endpoint at ${settings.url}. ${writes}
It requires an AAS Environment image with MCP support (BaSyx Go 1.1.3 or newer).

${commands}

${SIGN_IN_NOTES[settings.signIn](settings)}
`;
}
