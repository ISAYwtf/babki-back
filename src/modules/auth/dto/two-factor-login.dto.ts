import { IsIn, IsString, Matches } from 'class-validator';
import { IsSecondFactorCode } from './second-factor-code.validator';

export class TwoFactorLoginDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  challengeToken: string;

  @IsIn(['totp', 'recovery'])
  method: 'totp' | 'recovery';

  @IsString()
  @IsSecondFactorCode()
  code: string;
}
