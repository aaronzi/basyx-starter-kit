export interface EnvironmentService {
  environment?: Record<string, string> | string[];
}

export function readEnvironment(environment: string[] | undefined): Record<string, string> {
  if (!Array.isArray(environment)) {
    return {};
  }

  return environment.reduce<Record<string, string>>((result, entry) => {
    if (typeof entry !== 'string') {
      return result;
    }
    const separator = entry.indexOf('=');
    if (separator < 0) {
      return result;
    }
    result[entry.slice(0, separator)] = entry.slice(separator + 1);
    return result;
  }, {});
}

export function readServiceEnvironment(
  composeValue: unknown,
  serviceName = 'aas-environment'
): Record<string, string> {
  if (!composeValue || typeof composeValue !== 'object' || Array.isArray(composeValue)) {
    return {};
  }

  const services = (composeValue as Record<string, unknown>).services;
  if (!services || typeof services !== 'object' || Array.isArray(services)) {
    return {};
  }

  const service = (services as Record<string, unknown>)[serviceName];
  if (!service || typeof service !== 'object' || Array.isArray(service)) {
    return {};
  }

  const environment = (service as Record<string, unknown>).environment;
  if (Array.isArray(environment)) {
    return readEnvironment(environment);
  }
  if (!environment || typeof environment !== 'object' || Array.isArray(environment)) {
    return {};
  }

  return Object.entries(environment).reduce<Record<string, string>>((result, [key, value]) => {
    if (typeof value === 'string') {
      result[key] = value;
    }
    return result;
  }, {});
}

export function envBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() === 'true';
}

export function envNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
