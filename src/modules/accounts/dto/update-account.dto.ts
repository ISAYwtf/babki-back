import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentAccountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  savingsAmount?: number;

  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
