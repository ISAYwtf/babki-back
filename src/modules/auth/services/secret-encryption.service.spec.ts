import { ConfigService } from '@nestjs/config';
import {
  EncryptedSecretEnvelope,
  SecretEncryptionService,
} from './secret-encryption.service';

describe('SecretEncryptionService', () => {
  const key1 = Buffer.alloc(32, 1);
  const key2 = Buffer.alloc(32, 2);

  function createService(activeKeyId = 'v2') {
    return new SecretEncryptionService(
      new ConfigService({
        security: {
          totpEncryption: {
            activeKeyId,
            keys: { v1: key1, v2: key2 },
          },
        },
      }),
    );
  }

  it('round-trips a secret with a fresh 12-byte IV', () => {
    const service = createService();
    const first = service.encrypt('user-a', 'JBSWY3DPEHPK3PXP');
    const second = service.encrypt('user-a', 'JBSWY3DPEHPK3PXP');

    expect(first).toMatchObject({ formatVersion: 1, keyId: 'v2' });
    expect(Buffer.from(first.iv, 'base64')).toHaveLength(12);
    expect(first.iv).not.toBe(second.iv);
    expect(service.decrypt('user-a', first)).toEqual({
      plaintext: 'JBSWY3DPEHPK3PXP',
      needsRotation: false,
    });
  });

  it('binds ciphertext to the user id through authenticated data', () => {
    const service = createService();
    const envelope = service.encrypt('user-a', 'SECRET');

    expect(() => service.decrypt('user-b', envelope)).toThrow(
      'Unable to decrypt TOTP secret.',
    );
  });

  it.each(['ciphertext', 'authTag'] as const)(
    'rejects a modified %s',
    (field) => {
      const service = createService();
      const envelope = service.encrypt('user-a', 'SECRET');
      const tampered: EncryptedSecretEnvelope = {
        ...envelope,
        [field]: Buffer.alloc(16, 7).toString('base64'),
      };

      expect(() => service.decrypt('user-a', tampered)).toThrow(
        'Unable to decrypt TOTP secret.',
      );
    },
  );

  it('decrypts an inactive key and reports that rotation is needed', () => {
    const oldService = createService('v1');
    const envelope = oldService.encrypt('user-a', 'SECRET');

    expect(createService('v2').decrypt('user-a', envelope)).toEqual({
      plaintext: 'SECRET',
      needsRotation: true,
    });
  });

  it('rejects an unknown key id', () => {
    const service = createService();
    const envelope = service.encrypt('user-a', 'SECRET');

    expect(() =>
      service.decrypt('user-a', { ...envelope, keyId: 'missing' }),
    ).toThrow('Unknown TOTP encryption key.');
  });
});
