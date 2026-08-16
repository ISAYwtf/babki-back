import { Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

describe('RequestLoggingInterceptor', () => {
  it('logs request metadata without serializing authentication bodies', (done) => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const request = {
      method: 'POST',
      url: '/api/v1/auth/login/two-factor',
      body: {
        password: 'secret-password',
        token: '123456',
        challengeToken: 'opaque-challenge',
        accessToken: 'signed-access-token',
        secretEnvelope: { ciphertext: 'encrypted-secret' },
        recoveryCodes: ['plaintext-recovery'],
      },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    };

    new RequestLoggingInterceptor()
      .intercept(context as never, { handle: () => of({}) })
      .subscribe({
        complete: () => {
          const serialized = JSON.stringify(log.mock.calls);
          expect(serialized).toContain('POST');
          expect(serialized).toContain('/api/v1/auth/login/two-factor');
          for (const secret of Object.values(request.body).flatMap((value) =>
            typeof value === 'string' ? [value] : Object.values(value).flat(),
          )) {
            expect(serialized).not.toContain(String(secret));
          }
          log.mockRestore();
          done();
        },
      });
  });
});
