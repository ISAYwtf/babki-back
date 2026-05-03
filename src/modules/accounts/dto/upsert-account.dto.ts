import { Type } from 'class-transformer';
import { IsDateString, IsNumber, Min } from 'class-validator';

export class UpsertAccountDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentAccountAmount: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  savingsAmount: number;

  @IsDateString()
  asOfDate: string;
}
