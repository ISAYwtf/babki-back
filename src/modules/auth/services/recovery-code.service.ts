import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export type RecoveryCodeDigest = {
  keyId: string;
  digest: string;
};

type RecoveryKeyring = {
  activeKeyId: string;
  keys: Record<string, Buffer>;
};

@Injectable()
export class RecoveryCodeService {
  private readonly keyring: RecoveryKeyring;

  constructor(configService: ConfigService) {
    this.keyring = configService.getOrThrow<RecoveryKeyring>(
      'security.recoveryHmac',
    );
  }

  generate(count = 10) {
    const codes = Array.from({ length: count }, () =>
      this.format(this.encode(randomBytes(16))),
    );

    return {
      codes,
      digests: codes.map((code) => this.digest(code)),
    };
  }

  normalize(code: string) {
    const normalized = code.toUpperCase().replace(/[\s-]/g, '');
    if (
      normalized.length !== 26 ||
      !new RegExp(`^[${CROCKFORD_ALPHABET}]+$`).test(normalized)
    ) {
      throw new Error('Invalid recovery code.');
    }

    return normalized;
  }

  digest(code: string): RecoveryCodeDigest {
    const normalized = this.normalize(code);
    return {
      keyId: this.keyring.activeKeyId,
      digest: createHmac('sha256', this.keyring.keys[this.keyring.activeKeyId])
        .update(normalized, 'utf8')
        .digest('base64'),
    };
  }

  matches(code: string, stored: RecoveryCodeDigest) {
    const key = this.keyring.keys[stored.keyId];
    if (!key) {
      return false;
    }

    let normalized: string;
    try {
      normalized = this.normalize(code);
    } catch {
      return false;
    }

    const actual = createHmac('sha256', key)
      .update(normalized, 'utf8')
      .digest();
    const expected = Buffer.from(stored.digest, 'base64');
    return (
      expected.length === actual.length && timingSafeEqual(actual, expected)
    );
  }

  private encode(bytes: Buffer) {
    let value = BigInt(`0x${bytes.toString('hex')}`);
    let encoded = '';
    for (let i = 0; i < 26; i += 1) {
      encoded = CROCKFORD_ALPHABET[Number(value & 31n)] + encoded;
      value >>= 5n;
    }
    return encoded;
  }

  private format(code: string) {
    return `${code.slice(0, 5)}-${code.slice(5, 10)}-${code.slice(10, 15)}-${code.slice(15, 20)}-${code.slice(20)}`;
  }
}
