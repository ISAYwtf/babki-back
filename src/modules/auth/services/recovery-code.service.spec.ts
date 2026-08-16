import { ConfigService } from '@nestjs/config';
import { RecoveryCodeService } from './recovery-code.service';

describe('RecoveryCodeService', () => {
  const service = new RecoveryCodeService(
    new ConfigService({
      security: {
        recoveryHmac: {
          activeKeyId: 'v2',
          keys: { v1: Buffer.alloc(32, 1), v2: Buffer.alloc(32, 2) },
        },
      },
    }),
  );

  it('generates ten distinct grouped codes with 128 bits of entropy', () => {
    const result = service.generate();

    expect(result.codes).toHaveLength(10);
    expect(new Set(result.codes).size).toBe(10);
    expect(result.digests).toHaveLength(10);
    for (const code of result.codes) {
      expect(code).toMatch(
        /^[0-9A-HJKMNP-TV-Z]{5}(?:-[0-9A-HJKMNP-TV-Z]{5}){3}-[0-9A-HJKMNP-TV-Z]{6}$/,
      );
      expect(service.normalize(code)).toHaveLength(26);
    }
  });

  it('normalizes case and separators before matching a digest', () => {
    const generated = service.generate(1);
    const typed = generated.codes[0].toLowerCase().replaceAll('-', ' ');

    expect(service.matches(typed, generated.digests[0])).toBe(true);
  });

  it('selects the digest key by key id', () => {
    const generated = service.generate(1);

    expect(
      service.matches(generated.codes[0], {
        ...generated.digests[0],
        keyId: 'v1',
      }),
    ).toBe(false);
  });

  it.each(['', 'O0000-00000-00000-00000-000000', 'ABC'])(
    'rejects malformed recovery input %p',
    (code) => {
      expect(() => service.normalize(code)).toThrow('Invalid recovery code.');
    },
  );
});
