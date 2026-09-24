/** Accept only an HTTP(S) origin, without credentials, path, query, or fragment. */
export function parseTrustedOrigin(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  try {
    const url = new URL(value.trim());
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/** Extract the HTTP(S) origin from an endpoint URL that may include a path. */
export function getHttpOrigin(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function parseTrustedOriginsText(value: string): string[] | null {
  const values = value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const origins = values.map(parseTrustedOrigin);

  return origins.every((origin): origin is string => origin !== null) ? origins : null;
}
