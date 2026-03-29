import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { debtStatuses } from '../schemas/debt.schema';

export class CreateDebtDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  principalAmount: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  remainingAmount: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  creditor?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsIn(debtStatuses)
  status?: (typeof debtStatuses)[number];
}
