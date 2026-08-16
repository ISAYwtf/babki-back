import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegenerateRecoveryCodesDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @Matches(/^\d{6}$/)
  token: string;
}
