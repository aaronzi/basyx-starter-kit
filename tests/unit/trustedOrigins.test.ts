import { getHttpOrigin, parseTrustedOrigin, parseTrustedOriginsText } from '@/utils/trustedOrigins';

describe('trusted origin validation', () => {
  it.each([
    ['https://services.example.com', 'https://services.example.com'],
    ['http://localhost:8080', 'http://localhost:8080'],
    ['  https://services.example.com:8443  ', 'https://services.example.com:8443'],
  ])('accepts and normalizes %s', (value, expected) => {
    expect(parseTrustedOrigin(value)).toBe(expected);
  });

  it.each([
    'ftp://services.example.com',
    'https://user:pass@services.example.com',
    'https://services.example.com/api',
    'https://services.example.com?tenant=one',
    'https://services.example.com#section',
    'services.example.com',
    '*',
  ])('rejects unsafe or non-origin value %s', value => {
    expect(parseTrustedOrigin(value)).toBeNull();
  });

  it('parses one origin per line and rejects the full input when one line is invalid', () => {
    expect(parseTrustedOriginsText('https://one.example\n\nhttp://localhost:8080\n')).toEqual([
      'https://one.example',
      'http://localhost:8080',
    ]);
    expect(parseTrustedOriginsText('https://one.example\nhttps://two.example/path')).toBeNull();
  });

  it('extracts a safe origin from an endpoint URL', () => {
    expect(getHttpOrigin('https://influx.example:8443/api/v2')).toBe('https://influx.example:8443');
    expect(getHttpOrigin('https://token@influx.example/api/v2')).toBeNull();
  });
});
