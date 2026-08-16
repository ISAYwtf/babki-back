import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConfirmTwoFactorSetupDto } from './confirm-two-factor-setup.dto';
import { DisableTwoFactorDto } from './disable-two-factor.dto';
import { RegenerateRecoveryCodesDto } from './regenerate-recovery-codes.dto';
import { TwoFactorLoginDto } from './two-factor-login.dto';
import { TwoFactorSetupDto } from './two-factor-setup.dto';

async function errorsFor<T extends object>(type: new () => T, value: object) {
  return validate(plainToInstance(type, value), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('two-factor DTOs', () => {
  const challengeToken = 'A'.repeat(43);
  const recoveryCode = '01234-56789-ABCDE-FGHJK-MNPQRS';

  it('accepts an exact six-digit TOTP login code', async () => {
    await expect(
      errorsFor(TwoFactorLoginDto, {
        challengeToken,
        method: 'totp',
        code: '012345',
      }),
    ).resolves.toHaveLength(0);
  });

  it.each(['12345', '1234567', '12a456'])(
    'rejects invalid TOTP %s',
    async (code) => {
      expect(
        await errorsFor(TwoFactorLoginDto, {
          challengeToken,
          method: 'totp',
          code,
        }),
      ).not.toHaveLength(0);
    },
  );

  it('accepts grouped, case-insensitive Crockford recovery codes', async () => {
    await expect(
      errorsFor(TwoFactorLoginDto, {
        challengeToken,
        method: 'recovery',
        code: recoveryCode.toLowerCase(),
      }),
    ).resolves.toHaveLength(0);
  });

  it.each([
    '01234-56789-ABCDE-FGHJK-MNPQR',
    '01234-56789-ABCDE-FGHJK-MNPQRI',
    '01234-56789-ABCDE-FGHJK-MNPQR!',
  ])('rejects malformed recovery code %s', async (code) => {
    expect(
      await errorsFor(TwoFactorLoginDto, {
        challengeToken,
        method: 'recovery',
        code,
      }),
    ).not.toHaveLength(0);
  });

  it('rejects invalid methods and challenge token shapes', async () => {
    expect(
      await errorsFor(TwoFactorLoginDto, {
        challengeToken: `${'A'.repeat(42)}=`,
        method: 'sms',
        code: '012345',
      }),
    ).not.toHaveLength(0);
  });

  it('validates setup and management password requirements', async () => {
    expect(
      await errorsFor(TwoFactorSetupDto, { password: 'short' }),
    ).not.toHaveLength(0);
    expect(
      await errorsFor(DisableTwoFactorDto, {
        password: 'password123',
        method: 'recovery',
        code: recoveryCode,
      }),
    ).toHaveLength(0);
    expect(
      await errorsFor(RegenerateRecoveryCodesDto, {
        password: 'password123',
        token: '012345',
      }),
    ).toHaveLength(0);
  });

  it('validates confirmation and regeneration as TOTP-only operations', async () => {
    expect(
      await errorsFor(ConfirmTwoFactorSetupDto, { token: '012345' }),
    ).toHaveLength(0);
    expect(
      await errorsFor(RegenerateRecoveryCodesDto, {
        password: 'password123',
        token: recoveryCode,
      }),
    ).not.toHaveLength(0);
  });

  it('rejects unexpected fields under the global whitelist policy', async () => {
    expect(
      await errorsFor(TwoFactorSetupDto, {
        password: 'password123',
        secret: 'must-not-be-accepted',
      }),
    ).not.toHaveLength(0);
  });
});
