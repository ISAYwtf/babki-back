import { IsString, Matches } from 'class-validator';

export class ConfirmTwoFactorSetupDto {
  @IsString()
  @Matches(/^\d{6}$/)
  token: string;
}
