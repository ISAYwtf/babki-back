import {
  IsEmail,
  IsISO4217CurrencyCode,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  email: string;

  @IsISO4217CurrencyCode()
  currency: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
