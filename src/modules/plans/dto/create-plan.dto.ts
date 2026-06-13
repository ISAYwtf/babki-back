import { Type } from 'class-transformer';
import {
  IsDateString,
  IsMongoId,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MaxLength(500)
  description: string;

  @IsDateString()
  targetDate: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsMongoId()
  categoryId: string;
}
