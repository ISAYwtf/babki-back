import { ConfigService } from '@nestjs/config';
import { TotpService } from './totp.service';

describe('TotpService', () => {
  const rfcSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  const service = new TotpService(
    new ConfigService({ twoFactor: { issuer: 'Babki' } }),
  );

  it('matches the six-digit form of the RFC 6238 SHA-1 vector', async () => {
    await expect(service.generate(rfcSecret, 59)).resolves.toBe('287082');
  });

  it('generates a unique 160-bit Base32 secret', async () => {
    const first = service.generateSecret();
    const second = service.generateSecret();

    expect(first).toMatch(/^[A-Z2-7]{32}$/);
    expect(first).not.toBe(second);
  });

  it('creates an explicit compatible provisioning URI', () => {
    const uri = new URL(service.generateUri('ada@example.com', rfcSecret));

    expect(uri.protocol).toBe('otpauth:');
    expect(uri.hostname).toBe('totp');
    expect(uri.searchParams.get('issuer')).toBe('Babki');
    expect(uri.searchParams.get('algorithm')).toBe('SHA1');
    expect(uri.searchParams.get('digits')).toBe('6');
    expect(uri.searchParams.get('period')).toBe('30');
  });

  it.each([-1, 0, 1])('accepts an unused token at delta %i', async (delta) => {
    const now = 1_800_000_000;
    const token = await service.generate(rfcSecret, now + delta * 30);

    await expect(service.verify(rfcSecret, token, now)).resolves.toBe(
      Math.floor((now + delta * 30) / 30),
    );
  });

  it('rejects a token outside the three-step window', async () => {
    const now = 1_800_000_000;
    const token = await service.generate(rfcSecret, now - 60);

    await expect(service.verify(rfcSecret, token, now)).resolves.toBeNull();
  });
});
