export const DEFAULT_AAS_ENVIRONMENT_EXTERNAL_PORT = 8082;
export const DEFAULT_AAS_UI_EXTERNAL_PORT = 3000;
export const DEFAULT_EXTERNAL_BASE_URL = `http://localhost:${DEFAULT_AAS_ENVIRONMENT_EXTERNAL_PORT}`;

export interface ExternalBaseUrlParts {
  protocol: 'http' | 'https';
  host: string;
  port?: number;
  contextPath?: string;
}

const EXPLICIT_PORT_IN_AUTHORITY =
  /^([a-zA-Z][a-zA-Z\d+.-]*:\/\/(?:\[[^\]]+\]|[^/?#:]*)):(\d+)(?=[/?#]|$)/;
const AUTHORITY_WITH_OPTIONAL_PORT =
  /^([a-zA-Z][a-zA-Z\d+.-]*:\/\/)(\[[^\]]+\]|[^/?#:]+)(?::\d+)?(?=[/?#]|$)/;
const AUTHORITY_WITH_PATH =
  /^([a-zA-Z][a-zA-Z\d+.-]*:\/\/(?:\[[^\]]+\]|[^/?#]+))(\/[^?#]*)?(?:[?#].*)?$/;

export function normalizeExternalBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return DEFAULT_EXTERNAL_BASE_URL;
  }
  return trimmed.replace(/\/+$/, '');
}

export function parseExternalBaseUrl(baseUrl: string | undefined): ExternalBaseUrlParts {
  const normalizedBaseUrl = normalizeExternalBaseUrl(baseUrl);
  try {
    const url = new URL(normalizedBaseUrl);
    return {
      protocol: url.protocol === 'https:' ? 'https' : 'http',
      host: url.hostname,
      port: url.port ? Number(url.port) : undefined,
      contextPath: normalizeContextPath(url.pathname) || undefined,
    };
  } catch {
    const match = normalizedBaseUrl.match(AUTHORITY_WITH_PATH);
    const authority = match?.[1];
    return {
      protocol: normalizedBaseUrl.startsWith('https://') ? 'https' : 'http',
      host: authority ? authority.replace(/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//, '') : 'localhost',
      port: getExplicitUrlPort(normalizedBaseUrl),
      contextPath: normalizeContextPath(match?.[2]) || undefined,
    };
  }
}

export function buildExternalBaseUrl({
  protocol,
  host,
  port,
  contextPath,
}: ExternalBaseUrlParts): string {
  const normalizedHost = host.trim();
  const normalizedProtocol = protocol === 'https' ? 'https' : 'http';
  const normalizedPort = port ? `:${port}` : '';
  return `${normalizedProtocol}://${normalizedHost}${normalizedPort}${normalizeContextPath(contextPath)}`;
}

export function hasExplicitUrlPort(baseUrl: string | undefined): boolean {
  return EXPLICIT_PORT_IN_AUTHORITY.test(normalizeExternalBaseUrl(baseUrl));
}

export function getExplicitUrlPort(baseUrl: string | undefined): number | undefined {
  const match = normalizeExternalBaseUrl(baseUrl).match(EXPLICIT_PORT_IN_AUTHORITY);
  if (!match) {
    return undefined;
  }

  const port = Number(match[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return undefined;
  }
  return port;
}

export function replaceExplicitUrlPort(
  baseUrl: string | undefined,
  externalPort: number | undefined
): string {
  const value = baseUrl?.trim() || '';
  if (!externalPort || !hasExplicitUrlPort(value)) {
    return value;
  }

  return normalizeExternalBaseUrl(value).replace(EXPLICIT_PORT_IN_AUTHORITY, `$1:${externalPort}`);
}

export function buildAasEnvironmentExternalUrl(
  baseUrl: string | undefined,
  aasEnvironmentExternalPort: number | undefined,
  contextPath?: string
): string {
  let normalizedBaseUrl = normalizeExternalBaseUrl(baseUrl);
  if (contextPath !== undefined) {
    normalizedBaseUrl = replaceUrlPath(normalizedBaseUrl, contextPath);
  }

  if (!aasEnvironmentExternalPort || !hasExplicitUrlPort(normalizedBaseUrl)) {
    return normalizedBaseUrl;
  }

  return replaceExplicitUrlPort(normalizedBaseUrl, aasEnvironmentExternalPort);
}

export function buildExternalServiceUrl(
  baseUrl: string | undefined,
  externalPort: number | undefined,
  contextPath?: string
): string {
  const normalizedBaseUrl = normalizeExternalBaseUrl(baseUrl);
  if (!externalPort) {
    return appendPathToBaseUrl(normalizedBaseUrl, contextPath);
  }

  try {
    const url = new URL(normalizedBaseUrl);
    url.port = String(externalPort);
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return appendPathToBaseUrl(normalizeExternalBaseUrl(url.toString()), contextPath);
  } catch {
    const match = normalizedBaseUrl.match(AUTHORITY_WITH_OPTIONAL_PORT);
    if (!match) {
      return appendPathToBaseUrl(normalizedBaseUrl, contextPath);
    }
    return appendPathToBaseUrl(`${match[1]}${match[2]}:${externalPort}`, contextPath);
  }
}

export function normalizeContextPath(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }
  return `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

export function getUrlPath(baseUrl: string | undefined): string | undefined {
  const normalizedBaseUrl = normalizeExternalBaseUrl(baseUrl);
  try {
    return normalizeContextPath(new URL(normalizedBaseUrl).pathname) || undefined;
  } catch {
    const match = normalizedBaseUrl.match(AUTHORITY_WITH_PATH);
    return normalizeContextPath(match?.[2]) || undefined;
  }
}

export function replaceUrlPath(baseUrl: string | undefined, path: string | undefined): string {
  const normalizedBaseUrl = normalizeExternalBaseUrl(baseUrl);
  const normalizedPath = normalizeContextPath(path);

  try {
    const url = new URL(normalizedBaseUrl);
    url.pathname = normalizedPath;
    url.search = '';
    url.hash = '';
    return normalizeExternalBaseUrl(url.toString());
  } catch {
    const match = normalizedBaseUrl.match(AUTHORITY_WITH_PATH);
    if (!match) {
      return normalizedBaseUrl;
    }
    return `${match[1]}${normalizedPath}`;
  }
}

export function appendPathToBaseUrl(baseUrl: string, path: string | undefined): string {
  const normalizedPath = normalizeContextPath(path);
  if (!normalizedPath) {
    return normalizeExternalBaseUrl(baseUrl);
  }
  return `${normalizeExternalBaseUrl(baseUrl)}${normalizedPath}`;
}

export function joinBaseUrl(baseUrl: string, path: string): string {
  return `${normalizeExternalBaseUrl(baseUrl)}/${path.replace(/^\/+/, '')}`;
}
