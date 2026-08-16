import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const SECURITY_AUDIT_EVENT_TYPES = [
  'two_factor.enrolled',
  'two_factor.disabled',
  'two_factor.blocked',
  'recovery_code.used',
  'recovery_codes.regenerated',
] as const;

export type SecurityAuditEventType =
  (typeof SECURITY_AUDIT_EVENT_TYPES)[number];

@Schema({ _id: false })
export class SecurityAuditContext {
  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;
}

const SecurityAuditContextSchema =
  SchemaFactory.createForClass(SecurityAuditContext);

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class SecurityAuditEvent {
  @Prop({ required: true, index: true, type: Types.ObjectId })
  userId: Types.ObjectId;

  @Prop({ required: true, type: String, enum: SECURITY_AUDIT_EVENT_TYPES })
  type: SecurityAuditEventType;

  @Prop({ type: SecurityAuditContextSchema })
  context?: SecurityAuditContext;
}

export const SecurityAuditEventSchema =
  SchemaFactory.createForClass(SecurityAuditEvent);

export type SecurityAuditEventDocument = HydratedDocument<SecurityAuditEvent>;
