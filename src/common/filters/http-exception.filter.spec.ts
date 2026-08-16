import type { ArgumentsHost } from '@nestjs/common';
import { AuthRateLimitException } from '../../modules/auth/services/auth-throttle.service';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('sets Retry-After for persisted authentication blocks', () => {
    const response = {
      setHeader: jest.fn(),
      status: jest.fn(),
      json: jest.fn(),
    };
    response.status.mockReturnValue(response);
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url: '/api/v1/auth/login' }),
      }),
    } as unknown as ArgumentsHost;

    new HttpExceptionFilter().catch(new AuthRateLimitException(301), host);

    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '301');
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 429,
        path: '/api/v1/auth/login',
      }),
    );
    expect(response.json.mock.calls[0][0]).not.toHaveProperty('retryAfter');
  });

  it('does not serialize secret-bearing internal exceptions', () => {
    const response = {
      setHeader: jest.fn(),
      status: jest.fn(),
      json: jest.fn(),
    };
    response.status.mockReturnValue(response);
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url: '/api/v1/auth/two-factor/setup/confirm' }),
      }),
    } as unknown as ArgumentsHost;
    const exception = Object.assign(new Error('database failure'), {
      passwordHash: 'hashed-password',
      authVersion: 7,
      token: '123456',
      challengeDigest: 'challenge-digest',
      recoveryDigest: 'recovery-digest',
      accessToken: 'signed-access-token',
    });

    new HttpExceptionFilter().catch(exception, host);

    const payload = response.json.mock.calls[0][0];
    expect(payload).toMatchObject({
      statusCode: 500,
      message: 'Internal server error',
    });
    const serialized = JSON.stringify(payload);
    for (const secret of Object.values(exception).filter(
      (value): value is string => typeof value === 'string',
    )) {
      expect(serialized).not.toContain(secret);
    }
  });
});
