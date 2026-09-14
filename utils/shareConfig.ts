import type { SerializableStarterState } from '@/stores/app';
import { CONFIG_QUERY_KEY, encodeConfigHash, setQueryParam } from '@/utils/configPersistence';

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function buildShareConfigUrl(
  origin: string,
  pathWithQuery: string,
  state: SerializableStarterState
): string {
  const encoded = encodeConfigHash({
    route: pathWithQuery.split('?')[0] || '/',
    state,
  });
  const [path, query = ''] = pathWithQuery.split('?');
  const queryString = setQueryParam(query, CONFIG_QUERY_KEY, encoded);
  const normalizedOrigin = trimTrailingSlash(origin);
  return `${normalizedOrigin}${path}${queryString}`;
}
