import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model } from 'mongoose';
import {
  SecurityAuditEvent,
  SecurityAuditEventDocument,
  SecurityAuditEventType,
} from '../schemas/security-audit-event.schema';

export type SecurityRequestContext = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class SecurityAuditService {
  constructor(
    @InjectModel(SecurityAuditEvent.name)
    private readonly auditModel: Model<SecurityAuditEventDocument>,
  ) {}

  async record(
    userId: string,
    type: SecurityAuditEventType,
    context: SecurityRequestContext,
    session: ClientSession,
  ) {
    const safeContext = {
      ...(context.ip ? { ip: context.ip } : {}),
      ...(context.userAgent ? { userAgent: context.userAgent } : {}),
    };
    await this.auditModel.create([{ userId, type, context: safeContext }], {
      session,
    });
  }
}
