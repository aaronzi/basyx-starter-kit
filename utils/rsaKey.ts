const PEM_LINE_LENGTH = 64;

function toPem(encodedKey: ArrayBuffer): string {
  const bytes = new Uint8Array(encodedKey);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  const base64 = btoa(binary);
  const body = base64.match(new RegExp(`.{1,${PEM_LINE_LENGTH}}`, 'g'))?.join('\n');

  if (!body) {
    throw new Error('Could not encode the generated private key.');
  }

  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
}

export async function generateRsaPrivateKeyPem(): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is unavailable.');
  }

  const keyPair = (await globalThis.crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair;

  return toPem(await globalThis.crypto.subtle.exportKey('pkcs8', keyPair.privateKey));
}
