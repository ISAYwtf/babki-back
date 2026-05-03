import {
  IsDateString,
  IsEmail,
  IsISO4217CurrencyCode,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsISO4217CurrencyCode()
  currency: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
