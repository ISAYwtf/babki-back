import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Base32Plugin, CryptoPlugin } from '@otplib/core';
import { generate, verify } from '@otplib/totp';
import { generateTOTP } from '@otplib/uri';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const nodeCrypto: CryptoPlugin = {
  name: 'node',
  hmac: (algorithm, key, data) =>
    createHmac(algorithm, Buffer.from(key)).update(data).digest(),
  randomBytes,
  constantTimeEqual: (first, second) => {
    const left = Buffer.from(first);
    const right = Buffer.from(second);
    return left.length === right.length && timingSafeEqual(left, right);
  },
};

const base32: Base32Plugin = {
  name: 'rfc4648',
  encode: (data, options) => {
    let bits = 0;
    let value = 0;
    let encoded = '';
    for (const byte of data) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        encoded += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) {
      encoded += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }
    if (options?.padding) {
      encoded = encoded.padEnd(Math.ceil(encoded.length / 8) * 8, '=');
    }
    return encoded;
  },
  decode: (input) => {
    const normalized = input.toUpperCase().replace(/=+$/, '');
    let bits = 0;
    let value = 0;
    const decoded: number[] = [];
    for (const character of normalized) {
      const index = BASE32_ALPHABET.indexOf(character);
      if (index < 0) {
        throw new Error('Invalid Base32 secret.');
      }
      value = (value << 5) | index;
      bits += 5;
      if (bits >= 8) {
        decoded.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return Uint8Array.from(decoded);
  },
};

@Injectable()
export class TotpService {
  private readonly issuer: string;

  constructor(configService: ConfigService) {
    this.issuer = configService.getOrThrow<string>('twoFactor.issuer');
  }

  generateSecret() {
    return base32.encode(randomBytes(20));
  }

  generateUri(label: string, secret: string) {
    const uri = new URL(
      generateTOTP({
        issuer: this.issuer,
        label,
        secret,
        algorithm: 'sha1',
        digits: 6,
        period: 30,
      }),
    );
    uri.searchParams.set('algorithm', 'SHA1');
    uri.searchParams.set('digits', '6');
    uri.searchParams.set('period', '30');
    return uri.toString();
  }

  async generate(secret: string, epoch: number) {
    return generate({
      secret,
      crypto: nodeCrypto,
      base32,
      algorithm: 'sha1',
      digits: 6,
      period: 30,
      epoch,
    });
  }

  async verify(secret: string, token: string, epoch: number) {
    const result = await verify({
      secret,
      token,
      crypto: nodeCrypto,
      base32,
      algorithm: 'sha1',
      digits: 6,
      period: 30,
      epoch,
      epochTolerance: [30, 30],
    });

    return result.valid ? result.timeStep : null;
  }
}
