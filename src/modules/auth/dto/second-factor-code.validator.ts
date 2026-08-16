import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const TOTP_PATTERN = /^\d{6}$/;
const RECOVERY_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function IsSecondFactorCode(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isSecondFactorCode',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          const method = (args.object as { method?: unknown }).method;
          if (method === 'totp') {
            return TOTP_PATTERN.test(value);
          }
          if (method === 'recovery') {
            return RECOVERY_PATTERN.test(
              value.replace(/[ -]/g, '').toUpperCase(),
            );
          }
          return false;
        },
        defaultMessage() {
          return 'code must match the selected second-factor method';
        },
      },
    });
  };
}
