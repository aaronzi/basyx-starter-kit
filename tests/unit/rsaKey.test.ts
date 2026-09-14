import { generateRsaPrivateKeyPem } from '@/utils/rsaKey';

describe('RSA private key generation', () => {
  it('creates a PEM-encoded PKCS#8 RSA private key', async () => {
    const key = await generateRsaPrivateKeyPem();

    expect(key).toMatch(/^-----BEGIN PRIVATE KEY-----\n/);
    expect(key).toMatch(/\n-----END PRIVATE KEY-----\n$/);
    expect(key.length).toBeGreaterThan(1000);
  });
});
