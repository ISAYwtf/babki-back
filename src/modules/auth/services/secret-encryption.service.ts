import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type EncryptedSecretEnvelope = {
  formatVersion: 1;
  keyId: string;
  iv: string;
  ciphertext: string;
  authTag: string;
};

type EncryptionKeyring = {
  activeKeyId: string;
  keys: Record<string, Buffer>;
};

@Injectable()
export class SecretEncryptionService {
  private readonly keyring: EncryptionKeyring;

  constructor(configService: ConfigService) {
    this.keyring = configService.getOrThrow<EncryptionKeyring>(
      'security.totpEncryption',
    );
  }

  encrypt(userId: string, plaintext: string): EncryptedSecretEnvelope {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      'aes-256-gcm',
      this.keyring.keys[this.keyring.activeKeyId],
      iv,
    );
    cipher.setAAD(this.aad(userId));
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    return {
      formatVersion: 1,
      keyId: this.keyring.activeKeyId,
      iv: iv.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
    };
  }

  decrypt(userId: string, envelope: EncryptedSecretEnvelope) {
    const key = this.keyring.keys[envelope.keyId];
    if (!key) {
      throw new Error('Unknown TOTP encryption key.');
    }

    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(envelope.iv, 'base64'),
      );
      decipher.setAAD(this.aad(userId));
      decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8');

      return {
        plaintext,
        needsRotation: envelope.keyId !== this.keyring.activeKeyId,
      };
    } catch {
      throw new Error('Unable to decrypt TOTP secret.');
    }
  }

  private aad(userId: string) {
    return Buffer.from(`totp-secret:v1:${userId}`, 'utf8');
  }
}
