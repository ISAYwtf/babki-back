import { Type } from 'class-transformer';
import {
  IsDateString,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSaveDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsMongoId()
  @IsString()
  @MaxLength(255)
  sourceAccountId: string;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
