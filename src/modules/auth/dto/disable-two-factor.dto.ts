import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { IsSecondFactorCode } from './second-factor-code.validator';

export class DisableTwoFactorDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsIn(['totp', 'recovery'])
  method: 'totp' | 'recovery';

  @IsString()
  @IsSecondFactorCode()
  code: string;
}
