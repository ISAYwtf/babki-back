import { SecurityAuditService } from './security-audit.service';

describe('SecurityAuditService', () => {
  const model = { create: jest.fn() };
  const service = new SecurityAuditService(model as never);

  beforeEach(() => jest.clearAllMocks());

  it('stores an approved event with only narrow request context', async () => {
    model.create.mockResolvedValue([]);
    const session = {} as never;

    await service.record(
      '507f1f77bcf86cd799439011',
      'recovery_code.used',
      {
        ip: '203.0.113.10',
        userAgent: 'Browser/1.0',
        password: 'must-not-persist',
        token: 'must-not-persist',
      } as never,
      session,
    );

    expect(model.create).toHaveBeenCalledWith(
      [
        {
          userId: '507f1f77bcf86cd799439011',
          type: 'recovery_code.used',
          context: { ip: '203.0.113.10', userAgent: 'Browser/1.0' },
        },
      ],
      { session },
    );
  });
});
