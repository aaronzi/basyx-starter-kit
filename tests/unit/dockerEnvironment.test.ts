import {
  envBoolean,
  envNumber,
  readEnvironment,
  readServiceEnvironment,
} from '@/utils/dockerEnvironment';

describe('docker environment helpers', () => {
  it('reads values containing equals signs without truncating them', () => {
    expect(readEnvironment(['TOKEN=header.payload=signature', 'ENABLED=true'])).toEqual({
      TOKEN: 'header.payload=signature',
      ENABLED: 'true',
    });
  });

  it('reads the selected service and applies typed fallbacks', () => {
    const compose = {
      services: {
        'aas-environment': {
          environment: ['ENABLED=true', 'LIMIT=42'],
        },
      },
    };
    const env = readServiceEnvironment(compose);

    expect(envBoolean(env.ENABLED)).toBe(true);
    expect(envBoolean(undefined, true)).toBe(true);
    expect(envNumber(env.LIMIT, 5)).toBe(42);
    expect(envNumber('invalid', 5)).toBe(5);
  });

  it('reads mapping-style environments', () => {
    expect(
      readServiceEnvironment({
        services: {
          'aas-environment': {
            environment: {
              ENABLED: 'true',
              LIMIT: '42',
            },
          },
        },
      })
    ).toEqual({ ENABLED: 'true', LIMIT: '42' });
  });

  it('returns an empty environment for malformed compose services', () => {
    expect(readServiceEnvironment({ services: null })).toEqual({});
    expect(readServiceEnvironment({ services: { 'aas-environment': null } })).toEqual({});
  });
});
