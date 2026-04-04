import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RepayDebtDto {
  @IsDateString()
  repaymentDate: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  repaymentAmount: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
